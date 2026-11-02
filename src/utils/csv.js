const FORMULA_START = /^[=+\-@\t\r]/;

// Quotes values that need it. For free-text fields (text: true), values that
// could be run as a spreadsheet formula are neutralised with a leading apostrophe.
export function csvCell(value, { text = false } = {}) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (text && FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

// columns: [{ key, label, text? }], rows: array of objects
export function toCsv(columns, rows) {
  const head = columns.map((c) => csvCell(c.label, { text: true })).join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(row[c.key], { text: c.text })).join(','));
  return `\uFEFF${[head, ...body].join('\r\n')}\r\n`;
}

export function transactionsCsv(data) {
  const accounts = new Map((data.accounts || []).map((a) => [a.id, a.name]));
  const categories = new Map((data.categories || []).map((c) => [c.id, c.name]));
  const rows = [...(data.transactions || [])]
    .sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : a.occurred_on > b.occurred_on ? 1 : 0))
    .map((t) => ({
      date: t.occurred_on,
      type: t.kind,
      amount: t.amount,
      category: categories.get(t.category_id) || '',
      account: accounts.get(t.account_id) || '',
      description: t.description || '',
    }));
  return toCsv(
    [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount' },
      { key: 'category', label: 'Category', text: true },
      { key: 'account', label: 'Account', text: true },
      { key: 'description', label: 'Description', text: true },
    ],
    rows
  );
}