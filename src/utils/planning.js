import { round2 } from './finance.js';
import { daysBetween, monthKeyOf } from './dates.js';
import { toISODate } from './format.js';

export const STATE_COLOR = { ok: 'var(--green)', warn: 'var(--orange)', over: 'var(--red)' };

export function budgetStatus(spent, limit) {
  const s = Number(spent) || 0;
  const l = Number(limit) || 0;
  const pct = l > 0 ? (s / l) * 100 : 0;
  const state = s > l ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return { pct, remaining: round2(l - s), state };
}

// rows: [{ category_id, amount, occurred_on }] -> Map(monthKey -> Map(categoryId -> total))
export function groupSpend(rows = []) {
  const out = new Map();
  for (const r of rows) {
    if (!r.category_id) continue;
    const mk = monthKeyOf(r.occurred_on);
    if (!out.has(mk)) out.set(mk, new Map());
    const m = out.get(mk);
    m.set(r.category_id, round2((m.get(r.category_id) || 0) + (Number(r.amount) || 0)));
  }
  return out;
}

export function goalMetrics(goal, todayIso = toISODate()) {
  const target = Number(goal.target_amount) || 0;
  const saved = Number(goal.saved) || 0;
  const completed = saved >= target && target > 0;
  const pct = target > 0 ? Math.max(0, Math.min(100, (saved / target) * 100)) : 0;
  const remaining = Math.max(0, round2(target - saved));
  const daysLeft = goal.target_date ? daysBetween(todayIso, goal.target_date) : null;
  const overdue = !completed && daysLeft !== null && daysLeft < 0;
  let monthlyNeeded = null;
  if (!completed && daysLeft !== null && daysLeft > 0) {
    monthlyNeeded = round2(remaining / Math.max(1, daysLeft / 30.4375));
  }
  return { pct, remaining, daysLeft, overdue, monthlyNeeded, completed };
}

export function monthlyEquivalent(amount, frequency) {
  const a = Number(amount) || 0;
  if (frequency === 'weekly') return round2((a * 52) / 12);
  if (frequency === 'yearly') return round2(a / 12);
  return round2(a);
}