import { round2 } from './finance.js';
import { addMonths, monthKeyOf } from './dates.js';

const pad = (n) => String(n).padStart(2, '0');
const shortFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' });

export function shortMonth(monthIso) {
  const [y, m] = monthIso.split('-').map(Number);
  return shortFmt.format(new Date(y, m - 1, 1));
}

// Inclusive list of month keys ('YYYY-MM-01') covering fromIso..toIso.
export function monthsBetween(fromIso, toIso) {
  const start = monthKeyOf(fromIso);
  const end = monthKeyOf(toIso);
  const out = [];
  for (let m = start; m <= end && out.length < 600; m = addMonths(m, 1)) out.push(m);
  return out;
}

// Percentage of income kept, one decimal. null when there is no income.
export function savingsRate(income, expense) {
  if (!(income > 0)) return null;
  return Math.round(((income - expense) / income) * 1000) / 10;
}

export function filterRows(rows, from, to) {
  return rows.filter((r) => (!from || r.occurred_on >= from) && (!to || r.occurred_on <= to));
}

export function monthlySeries(rows, months) {
  const map = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const r of rows) {
    const bucket = map.get(monthKeyOf(r.occurred_on));
    if (!bucket) continue;
    const a = Number(r.amount) || 0;
    if (r.kind === 'income') bucket.income += a;
    else if (r.kind === 'expense') bucket.expense += a;
  }
  return months.map((m) => {
    const b = map.get(m);
    const income = round2(b.income);
    const expense = round2(b.expense);
    return {
      month: m,
      label: shortMonth(m),
      income,
      expense,
      net: round2(income - expense),
      savingsRate: savingsRate(income, expense),
    };
  });
}

export function categoryBreakdown(rows, categories, kind = 'expense') {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map();
  let total = 0;
  for (const r of rows) {
    if (r.kind !== kind) continue;
    const a = Number(r.amount) || 0;
    const key = r.category_id && byId.has(r.category_id) ? r.category_id : 'none';
    totals.set(key, (totals.get(key) || 0) + a);
    total += a;
  }
  return [...totals.entries()]
    .map(([id, value]) => ({
      id,
      name: id === 'none' ? 'Uncategorised' : byId.get(id).name,
      value: round2(value),
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// Net worth at the end of each month (or today for the current month):
// opening balances + all recorded income - all recorded expenses up to that date.
// Transfers net to zero, so they are ignored. `rows` must be ALL transactions.
export function netWorthSeries(rows, months, openingTotal, todayIso) {
  const sorted = [...rows].sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : a.occurred_on > b.occurred_on ? 1 : 0));
  let i = 0;
  let running = Number(openingTotal) || 0;
  return months.map((m) => {
    const [y, mo] = m.split('-').map(Number);
    const last = `${y}-${pad(mo)}-${pad(new Date(y, mo, 0).getDate())}`;
    const end = last < todayIso ? last : todayIso;
    while (i < sorted.length && sorted[i].occurred_on <= end) {
      const a = Number(sorted[i].amount) || 0;
      running += sorted[i].kind === 'income' ? a : -a;
      i += 1;
    }
    return { month: m, label: shortMonth(m), value: round2(running) };
  });
}

export function yearsIn(rows) {
  return [...new Set(rows.map((r) => r.occurred_on.slice(0, 4)))].sort().reverse();
}

export const PRESETS = [
  { id: 'this_month', label: 'This month' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
  { id: 'ytd', label: 'This year' },
];

export function rangeFromPreset(preset, todayIso) {
  const thisMonth = `${todayIso.slice(0, 7)}-01`;
  switch (preset) {
    case '3m':
      return { from: addMonths(thisMonth, -2), to: todayIso };
    case '6m':
      return { from: addMonths(thisMonth, -5), to: todayIso };
    case '12m':
      return { from: addMonths(thisMonth, -11), to: todayIso };
    case 'ytd':
      return { from: `${todayIso.slice(0, 4)}-01-01`, to: todayIso };
    default:
      return { from: thisMonth, to: todayIso };
  }
}