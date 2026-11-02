import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parseAmountOrZero,
  summarizeAccounts,
  sumByKind,
  toStoredOpening,
  fromStoredOpening,
} from '../src/utils/finance.js';

describe('parseAmount', () => {
  it('accepts positive amounts with up to 2 decimals', () => {
    expect(parseAmount('10')).toBe(10);
    expect(parseAmount('10.5')).toBe(10.5);
    expect(parseAmount(' 0.01 ')).toBe(0.01);
  });
  it('rejects invalid amounts', () => {
    for (const v of ['', '0', '-5', '1.234', 'abc', '1e5', '1,000']) expect(parseAmount(v)).toBeNaN();
  });
  it('allows zero/empty in parseAmountOrZero', () => {
    expect(parseAmountOrZero('')).toBe(0);
    expect(parseAmountOrZero('0')).toBe(0);
    expect(parseAmountOrZero('-1')).toBeNaN();
  });
});

describe('opening balance storage', () => {
  it('stores liabilities as negative and restores them', () => {
    expect(toStoredOpening('loan', 500)).toBe(-500);
    expect(toStoredOpening('bank', 500)).toBe(500);
    expect(toStoredOpening('loan', 0)).toBe(0);
    expect(fromStoredOpening('loan', -500)).toBe(500);
    expect(fromStoredOpening('bank', 500)).toBe(500);
  });
});

describe('summarizeAccounts', () => {
  it('computes assets, liabilities and net worth', () => {
    const r = summarizeAccounts([
      { type: 'bank', balance: 1000.1 },
      { type: 'cash', balance: 200.2 },
      { type: 'credit_card', balance: -300.3 },
      { type: 'loan', balance: -1000 },
    ]);
    expect(r.assets).toBe(1200.3);
    expect(r.liabilities).toBe(1300.3);
    expect(r.netWorth).toBe(-100);
  });
  it('treats a positive liability balance as an asset (overpaid)', () => {
    expect(summarizeAccounts([{ type: 'credit_card', balance: 50 }]).assets).toBe(50);
  });
});

describe('sumByKind', () => {
  it('sums income and expense without float drift', () => {
    const r = sumByKind([
      { kind: 'income', amount: '0.1' },
      { kind: 'income', amount: '0.2' },
      { kind: 'expense', amount: '0.05' },
    ]);
    expect(r.income).toBe(0.3);
    expect(r.expense).toBe(0.05);
    expect(r.net).toBe(0.25);
  });
});