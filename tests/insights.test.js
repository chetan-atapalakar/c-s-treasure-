import { describe, it, expect } from 'vitest';
import { buildInsights } from '../src/utils/insights.js';

const fmt = (n) => `$${n}`;
const categories = [{ id: 'A', name: 'Food', kind: 'expense' }];
const base = { month: '2026-11-01', categories, fmt, today: '2026-11-02' };

const rows = [
  { kind: 'income', amount: 1000, category_id: null, occurred_on: '2026-11-01' },
  { kind: 'expense', amount: 400, category_id: 'A', description: 'Groceries', occurred_on: '2026-11-02' },
  { kind: 'income', amount: 1000, category_id: null, occurred_on: '2026-10-01' },
  { kind: 'expense', amount: 200, category_id: 'A', description: '', occurred_on: '2026-10-05' },
];

describe('buildInsights', () => {
  it('reports savings, spending change and top category', () => {
    const r = buildInsights({ ...base, rows });
    const byId = Object.fromEntries(r.map((x) => [x.id, x]));
    expect(byId.savings.tone).toBe('good');
    expect(byId.savings.body).toContain('60%');
    expect(byId['spending-change'].tone).toBe('warn');
    expect(byId['top-category'].body).toContain('Food');
  });

  it('flags exceeded budgets as alerts and sorts alerts first', () => {
    const r = buildInsights({ ...base, rows, budgets: [{ category_id: 'A', limit_amount: 300 }] });
    expect(r[0].id).toBe('budget-over');
    expect(r[0].tone).toBe('alert');
  });

  it('confirms budgets that are on track', () => {
    const r = buildInsights({ ...base, rows, budgets: [{ category_id: 'A', limit_amount: 1000 }] });
    expect(r.some((x) => x.id === 'budget-ok')).toBe(true);
  });

  it('handles months without transactions', () => {
    const r = buildInsights({ ...base, rows: [] });
    expect(r.map((x) => x.id)).toEqual(['no-data']);
  });

  it('describes goals with a target date', () => {
    const goals = [{ id: 'g1', name: 'Trip', target_amount: 1200, saved: 200, target_date: '2027-01-01', completed: false }];
    const r = buildInsights({ ...base, rows: [], goals });
    expect(r.some((x) => x.id === 'goal-g1')).toBe(true);
  });
});