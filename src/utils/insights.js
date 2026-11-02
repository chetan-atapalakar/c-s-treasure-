import { round2, sumByKind } from './finance.js';
import { addMonths, monthKeyOf, monthLabel } from './dates.js';
import { formatDate } from './format.js';
import { budgetStatus, goalMetrics, monthlyEquivalent } from './planning.js';
import { categoryBreakdown, savingsRate } from './analytics.js';

const inMonth = (rows, month) => rows.filter((r) => monthKeyOf(r.occurred_on) === month);
const pctChange = (from, to) => (from > 0 ? ((to - from) / from) * 100 : null);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const TONE_ORDER = { alert: 0, warn: 1, good: 2, info: 3 };

// Every insight describes recorded data only. No forecasts or advice.
export function buildInsights({ month, rows, categories, budgets = [], goals = [], recurring = [], fmt, today }) {
  const out = [];
  const add = (id, tone, title, body) => out.push({ id, tone, title, body });

  const prevMonth = addMonths(month, -1);
  const label = monthLabel(month);
  const prevLabel = monthLabel(prevMonth);
  const cur = inMonth(rows, month);
  const prev = inMonth(rows, prevMonth);
  const c = sumByKind(cur);
  const p = sumByKind(prev);
  const catName = new Map(categories.map((x) => [x.id, x.name]));

  if (cur.length === 0) {
    add('no-data', 'info', `No transactions in ${label}`, 'Add income and expenses for this month to see spending and savings observations.');
  } else {
    // Savings
    const rate = savingsRate(c.income, c.expense);
    if (rate !== null) {
      const prevRate = savingsRate(p.income, p.expense);
      const delta = prevRate !== null ? Math.round((rate - prevRate) * 10) / 10 : null;
      if (rate < 0) {
        add('savings', 'alert', 'Spent more than earned', `Expenses exceeded income by ${fmt(round2(c.expense - c.income))} in ${label}.`);
      } else {
        const cmp = delta === null || delta === 0 ? '' : ` That is ${Math.abs(delta)} points ${delta > 0 ? 'higher' : 'lower'} than ${prevLabel}.`;
        add('savings', 'good', 'Savings rate', `You kept ${rate}% of your income in ${label} (${fmt(c.net)}).${cmp}`);
      }
    } else if (c.expense > 0) {
      add('savings', 'info', 'No income recorded', `Expenses of ${fmt(c.expense)} were recorded in ${label}, but no income.`);
    }

    // Spending vs previous month
    const ch = pctChange(p.expense, c.expense);
    if (ch !== null && c.expense > 0) {
      const abs = Math.round(Math.abs(ch));
      if (Math.abs(ch) >= 10) {
        add(
          'spending-change',
          ch > 0 ? 'warn' : 'good',
          ch > 0 ? 'Spending is up' : 'Spending is down',
          `Expenses were ${fmt(c.expense)}, ${abs}% ${ch > 0 ? 'higher' : 'lower'} than ${prevLabel} (${fmt(p.expense)}).`
        );
      } else {
        add('spending-change', 'info', 'Spending is steady', `Expenses were ${fmt(c.expense)}, within 10% of ${prevLabel} (${fmt(p.expense)}).`);
      }
    }

    // Category observations
    const curBreak = categoryBreakdown(cur, categories);
    const prevBreak = categoryBreakdown(prev, categories);
    if (curBreak.length > 0) {
      const top = curBreak[0];
      add('top-category', 'info', 'Largest spending category', `${top.name} was your largest expense category at ${fmt(top.value)}, ${Math.round(top.pct)}% of spending.`);
    }
    const curMap = new Map(curBreak.map((x) => [x.id, x.value]));
    const prevMap = new Map(prevBreak.map((x) => [x.id, x.value]));
    let up = null;
    let down = null;
    for (const id of new Set([...curMap.keys(), ...prevMap.keys()])) {
      if (id === 'none') continue;
      const a = prevMap.get(id) || 0;
      const b = curMap.get(id) || 0;
      if (a <= 0) continue;
      const diff = round2(b - a);
      const rel = Math.abs(diff) / a;
      if (rel < 0.2) continue;
      if (diff > 0 && (!up || diff > up.diff)) up = { id, a, b, diff };
      if (diff < 0 && (!down || diff < down.diff)) down = { id, a, b, diff };
    }
    if (up) add('cat-up', 'warn', 'Biggest increase', `Spending on ${catName.get(up.id)} rose by ${fmt(up.diff)}, from ${fmt(up.a)} in ${prevLabel} to ${fmt(up.b)}.`);
    if (down) add('cat-down', 'good', 'Biggest decrease', `Spending on ${catName.get(down.id)} fell by ${fmt(Math.abs(down.diff))}, from ${fmt(down.a)} in ${prevLabel} to ${fmt(down.b)}.`);

    const none = curBreak.find((x) => x.id === 'none');
    if (none && none.pct >= 20) {
      add('uncategorised', 'info', 'Uncategorised spending', `${Math.round(none.pct)}% of ${label} expenses (${fmt(none.value)}) have no category. Categorising them sharpens these insights.`);
    }

    // Largest single expense
    const expenses = cur.filter((r) => r.kind === 'expense');
    if (expenses.length > 0) {
      const big = expenses.reduce((m, r) => (Number(r.amount) > Number(m.amount) ? r : m), expenses[0]);
      const what = big.description || catName.get(big.category_id);
      add('largest', 'info', 'Largest single expense', `${fmt(Number(big.amount))}${what ? ` on ${what}` : ''}, recorded on ${formatDate(big.occurred_on)}.`);
    }

    // Budgets
    if (budgets.length > 0) {
      const spendById = new Map(curBreak.map((x) => [x.id, x.value]));
      const over = [];
      const near = [];
      for (const b of budgets) {
        const spent = spendById.get(b.category_id) || 0;
        const s = budgetStatus(spent, b.limit_amount);
        const text = `${catName.get(b.category_id) || 'Category'} (${fmt(spent)} of ${fmt(Number(b.limit_amount))})`;
        if (s.state === 'over') over.push(text);
        else if (s.state === 'warn') near.push(text);
      }
      if (over.length) add('budget-over', 'alert', `${plural(over.length, 'budget')} exceeded`, `Over limit in ${label}: ${over.join(', ')}.`);
      if (near.length) add('budget-near', 'warn', `${plural(near.length, 'budget')} nearing the limit`, `At 80% or more: ${near.join(', ')}.`);
      if (!over.length && !near.length) add('budget-ok', 'good', 'Budgets on track', `All ${plural(budgets.length, 'budget')} for ${label} are below 80% of their limits.`);
    }
  }

  // Recurring subscriptions (current state)
  const subs = recurring.filter((r) => r.active && r.is_subscription && r.kind === 'expense');
  if (subs.length > 0) {
    const total = round2(subs.reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency), 0));
    const share = c.income > 0 ? ` That is ${Math.round((total / c.income) * 100)}% of your ${label} income.` : '';
    add('subscriptions', 'info', 'Subscriptions', `${plural(subs.length, 'active subscription')} cost about ${fmt(total)} per month.${share}`);
  }

  // Goals (current state)
  const activeGoals = goals.filter((g) => !g.completed);
  const doneGoals = goals.filter((g) => g.completed);
  const scored = activeGoals.map((g) => ({ g, m: goalMetrics(g, today) }));
  scored
    .filter((x) => x.m.monthlyNeeded !== null)
    .sort((a, b) => a.m.daysLeft - b.m.daysLeft)
    .slice(0, 2)
    .forEach(({ g, m }) => {
      add(`goal-${g.id}`, 'info', g.name, `${fmt(m.remaining)} left to save. About ${fmt(m.monthlyNeeded)} per month reaches it by ${formatDate(g.target_date)}.`);
    });
  scored
    .filter((x) => x.m.overdue)
    .slice(0, 2)
    .forEach(({ g, m }) => {
      add(`goal-late-${g.id}`, 'warn', `${g.name}: target date passed`, `${fmt(m.remaining)} is still to go. You can edit the target date on the Savings Goals page.`);
    });
  if (doneGoals.length > 0) add('goals-done', 'good', 'Goals completed', `You have reached ${plural(doneGoals.length, 'savings goal')}.`);

  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}