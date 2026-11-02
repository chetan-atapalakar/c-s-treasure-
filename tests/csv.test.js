import { describe, it, expect } from 'vitest';
import { csvCell, toCsv, transactionsCsv } from '../src/utils/csv.js';

describe('csvCell', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
  it('neutralises spreadsheet formulas in text fields only', () => {
    expect(csvCell('=SUM(A1)', { text: true })).toBe("'=SUM(A1)");
    expect(csvCell('+1', { text: true })).toBe("'+1");
    expect(csvCell(-25.5)).toBe('-25.5');
  });
  it('renders empty values as empty strings', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('writes a header and rows with CRLF endings', () => {
    const out = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], [{ a: 1, b: 'x' }]);
    expect(out).toBe('\uFEFFA,B\r\n1,x\r\n');
  });
});

describe('transactionsCsv', () => {
  it('maps ids to names and sorts by date', () => {
    const csv = transactionsCsv({
      accounts: [{ id: 'a1', name: 'Cash' }],
      categories: [{ id: 'c1', name: 'Food' }],
      transactions: [
        { occurred_on: '2026-10-05', kind: 'expense', amount: '12.50', category_id: 'c1', account_id: 'a1', description: '=bad' },
        { occurred_on: '2026-10-01', kind: 'income', amount: '100.00', category_id: null, account_id: 'a1', description: 'Pay' },
      ],
    });
    const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Amount,Category,Account,Description');
    expect(lines[1]).toBe('2026-10-01,income,100.00,,Cash,Pay');
    expect(lines[2]).toBe("2026-10-05,expense,12.50,Food,Cash,'=bad");
  });
});