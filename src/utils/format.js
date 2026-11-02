export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', label: 'Euro (€)', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'AED', label: 'UAE Dirham (AED)', locale: 'en-AE' },
  { code: 'SGD', label: 'Singapore Dollar (S$)', locale: 'en-SG' },
  { code: 'AUD', label: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'CAD', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'JPY', label: 'Japanese Yen (¥)', locale: 'ja-JP' },
];

const localeFor = (code) => CURRENCIES.find((c) => c.code === code)?.locale || 'en-US';

export function formatMoney(amount, currency = 'INR', { hidden = false } = {}) {
  if (hidden) return '••••••';
  const n = Number(amount) || 0;
  return new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(n);
}

export function formatCompact(amount, currency = 'INR') {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDate(iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(y, m - 1, d));
}

const pad = (n) => String(n).padStart(2, '0');
export const toISODate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const monthStart = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;

export function initials(name = '', email = '') {
  const src = name.trim() || email.split('@')[0] || '?';
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}