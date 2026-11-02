import { describe, it, expect } from 'vitest';
import { budgetStatus, goalMetrics, groupSpend, monthlyEquivalent } from '../src/utils/planning.js';
import { addMonths, daysBetween } from '../src/utils/dates.js';

describe('budgetStatus', () => {
  it('classifies ok / warn / over', () => {
    expect(budgetStatus(50, 100).state).toBe('ok');
    expect(budgetStatus(80, 100).state).toBe('warn');
    expect(budgetStatus(100, 100).state).toBe('warn');
    expect(budgetStatus(100.01, 100).state).toBe('over');
  });
  it('computes remaining without float drift', () => {
    expect(budgetStatus(0.1 + 0.2, 1).remaining).toBe(0.7);
    expect(budgetStatus(150, 100).remaining).toBe(-50);
  });
});

describe('goalMetrics', () => {
  it('computes progress and monthly amount needed', () => {
    const m = goalMetrics({ target_amount: 1200, saved: 200, target_date: '2027-01-01' }, '2026-11-01');
    expect(m.pct).toBeCloseTo(16.67, 1);
    expect(m.remaining).toBe(1000);
    expect(m.daysLeft).toBe(61);
    expect(m.monthlyNeeded).toBeCloseTo(498.98, 1);
    expect(m.completed).toBe(false);
  });
  it('handles completed and overdue goals', () => {
    expect(goalMetrics({ target_amount: 100, saved: 150, target_date: null }).completed).toBe(true);
    const done = goalMetrics({ target_amount: 100, saved: 100, target_date: '2020-01-01' }, '2026-11-01');
    expect(done.overdue).toBe(false);
    expect(done.monthlyNeeded).toBe(null);
    expect(goalMetrics({ target_amount: 100, saved: 10, target_date: '2020-01-01' }, '2026-11-01').overdue).toBe(true);
  });
});

describe('groupSpend', () => {
  it('sums by month and category and skips uncategorised', () => {
    const g = groupSpend([
      { category_id: 'a', amount: '0.1', occurred_on: '2026-10-03' },
      { category_id: 'a', amount: '0.2', occurred_on: '2026-10-20' },
      { category_id: 'b', amount: '5', occurred_on: '2026-11-01' },
      { category_id: null, amount: '9', occurred_on: '2026-11-01' },
    ]);
    expect(g.get('2026-10-01').get('a')).toBe(0.3);
    expect(g.get('2026-11-01').get('b')).toBe(5);
    expect(g.get('2026-11-01').size).toBe(1);
  });
});

describe('monthlyEquivalent', () => {
  it('normalises frequencies to a monthly amount', () => {
    expect(monthlyEquivalent(100, 'weekly')).toBe(433.33);
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100);
    expect(monthlyEquivalent(50, 'monthly')).toBe(50);
  });
});

describe('dates', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01');
    expect(addMonths('2027-01-01', -1)).toBe('2026-12-01');
  });
  it('counts days between dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-30')).toBe(29);
  });
});