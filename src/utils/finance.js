export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash', icon: 'wallet' },
  { value: 'bank', label: 'Bank account', icon: 'home' },
  { value: 'wallet', label: 'Digital wallet', icon: 'wallet' },
  { value: 'investment', label: 'Investment', icon: 'trending' },
  { value: 'credit_card', label: 'Credit card', icon: 'receipt' },
  { value: 'loan', label: 'Loan', icon: 'arrowDown' },
];

export const LIABILITY_TYPES = ['credit_card', 'loan'];
export const isLiability = (type) => LIABILITY_TYPES.includes(type);
export const accountTypeMeta = (type) => ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[0];

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const MAX = 1e11;

// Strictly positive amount with at most 2 decimals. Returns NaN when invalid.
export function parseAmount(input) {
  const s = String(input ?? '').trim();
  if (!AMOUNT_RE.test(s)) return NaN;
  const n = Number(s);
  return n > 0 && n < MAX ? n : NaN;
}

// Like parseAmount but an empty value or 0 is allowed.
export function parseAmountOrZero(input) {
  const s = String(input ?? '').trim();
  if (s === '') return 0;
  if (!AMOUNT_RE.test(s)) return NaN;
  const n = Number(s);
  return n < MAX ? n : NaN;
}

// Liabilities are stored as negative opening balances (amount owed).
export const toStoredOpening = (type, amount) => (isLiability(type) && amount !== 0 ? -amount : amount);
export const fromStoredOpening = (type, stored) => {
  const n = Number(stored) || 0;
  return isLiability(type) ? (n === 0 ? 0 : -n) : n;
};

export function summarizeAccounts(accounts = []) {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    const b = Number(a.balance) || 0;
    if (isLiability(a.type) && b < 0) liabilities += -b;
    else assets += b;
  }
  assets = round2(assets);
  liabilities = round2(liabilities);
  return { assets, liabilities, netWorth: round2(assets - liabilities) };
}

export function sumByKind(transactions = []) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.kind === 'income') income += amt;
    else if (t.kind === 'expense') expense += amt;
  }
  income = round2(income);
  expense = round2(expense);
  return { income, expense, net: round2(income - expense) };
}