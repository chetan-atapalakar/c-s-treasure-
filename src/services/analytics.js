import { supabase } from './supabase.js';
import { unwrap } from './api.js';
import { fetchAllPages } from './paged.js';

const COLS = 'id, account_id, category_id, kind, amount, description, occurred_on';

export function listAllTxRows() {
  return fetchAllPages(() => supabase.from('transactions').select(COLS).order('occurred_on').order('id'));
}

// occurred_on in [from, toExclusive)
export function listTxRowsBetween(from, toExclusive) {
  return fetchAllPages(() =>
    supabase.from('transactions').select(COLS).gte('occurred_on', from).lt('occurred_on', toExclusive).order('occurred_on').order('id')
  );
}

export async function listRecentTransactions(limit = 6) {
  return unwrap(
    await supabase.from('transactions').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(limit)
  );
}

export async function listRecentNotifications(limit = 4) {
  return unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit));
}