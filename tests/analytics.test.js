import { describe, it, expect } from 'vitest';
import { categoryBreakdown, monthlySeries, monthsBetween, netWorthSeries, rangeFromPreset, savingsRate, yearsIn } from '../src/utils/analytics.js';

describe('monthsBetween', () => {
  it('lists month keys inclusively across years', () => {
    expect(monthsBetween('2026-11-15', '2027-01-03')).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });
});

describe('savingsRate', () => {
  it('returns null without income and rounds to one decimal', () => {
    expect(savingsRate(0, 50)).toBeNull();
    expect(savingsRate(1000, 400)).toBe(60);
    expect(savingsRate(300, 400)).toBe(-33.3);
  });
});

describe('monthlySeries', () => {
  it('buckets rows per month without float drift', () => {
    const rows = [
      { kind: 'income', amount: '0.1', occurred_on: '2026-10-01' },
      { kind: 'income', amount: '0.2', occurred_on: '2026-10-09' },
      { kind: 'expense', amount: '0.05', occurred_on: '2026-10-10' },
      { kind: 'expense', amount: '7', occurred_on: '2026-11-02' },
      { kind: 'expense', amount: '99', occurred_on: '2026-01-02' },
    ];
    const s = monthlySeries(rows, ['2026-10-01', '2026-11-01']);
    expect(s[0]).toMatchObject({ income: 0.3, expense: 0.05, net: 0.25 });
    expect(s[1]).toMatchObject({ income: 0, expense: 7, net: -7, savingsRate: null });
  });
});

describe('categoryBreakdown', () => {
  it('sums expenses per category, sorted, with uncategorised', () => {
    const cats = [{ id: 'a', name: 'Food' }, { id: 'b', name: 'Rent' }];
    const rows = [
      { kind: 'expense', amount: 30, category_id: 'a' },
      { kind: 'expense', amount: 60, category_id: 'b' },
      { kind: 'expense', amount: 10, category_id: null },
      { kind: 'income', amount: 500, category_id: 'a' },
    ];
    const r = categoryBreakdown(rows, cats);
    expect(r.map((x) => x.name)).toEqual(['Rent', 'Food', 'Uncategorised']);
    expect(r[0].pct).toBe(60);
  });
});

describe('netWorthSeries', () => {
  it('accumulates from opening balances and ignores future-dated rows', () => {
    const rows = [
      { kind: 'income', amount: 500, occurred_on: '2026-09-10' },
      { kind: 'expense', amount: 200, occurred_on: '2026-10-05' },
      { kind: 'income', amount: 100, occurred_on: '2026-11-20' },
    ];
    const s = netWorthSeries(rows, ['2026-09-01', '2026-10-01', '2026-11-01'], 1000, '2026-11-02');
    expect(s.map((x) => x.value)).toEqual([1500, 1300, 1300]);
  });
});

describe('helpers', () => {
  it('lists years newest first', () => {
    expect(yearsIn([{ occurred_on: '2025-03-01' }, { occurred_on: '2026-01-01' }, { occurred_on: '2025-12-31' }])).toEqual(['2026', '2025']);
  });
  it('builds preset ranges', () => {
    expect(rangeFromPreset('6m', '2026-11-02')).toEqual({ from: '2026-06-01', to: '2026-11-02' });
    expect(rangeFromPreset('ytd', '2026-11-02')).toEqual({ from: '2026-01-01', to: '2026-11-02' });
    expect(rangeFromPreset('this_month', '2026-11-02').from).toBe('2026-11-01');
  });
});