import { toISODate } from './format.js';

const pad = (n) => String(n).padStart(2, '0');

export const monthKeyOf = (iso) => `${String(iso).slice(0, 7)}-01`;

export function addMonths(monthIso, n) {
  const [y, m] = monthIso.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

export function monthLabel(monthIso) {
  const [y, m] = monthIso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

export function daysBetween(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toIso.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export const daysUntil = (iso) => daysBetween(toISODate(), iso);