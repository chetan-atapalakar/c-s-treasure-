import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../utils/format.js';

export default function useMoney() {
  const { profile } = useAuth();
  const currency = profile?.currency || 'INR';
  const hidden = Boolean(profile?.hide_balances);
  const fmt = useCallback((amount) => formatMoney(amount, currency, { hidden }), [currency, hidden]);
  return { fmt, currency, hidden };
}