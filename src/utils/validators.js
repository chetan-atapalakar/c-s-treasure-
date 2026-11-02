export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function passwordChecks(pw = '') {
  return { length: pw.length >= 8, letter: /[A-Za-z]/.test(pw), number: /\d/.test(pw) };
}

export function isStrongEnough(pw = '') {
  const c = passwordChecks(pw);
  return c.length && c.letter && c.number;
}

// 0 (empty) .. 4 (strong)
export function passwordScore(pw = '') {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, Math.min(s, 4));
}