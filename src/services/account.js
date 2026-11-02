import { supabase } from './supabase.js';
import { unwrap } from './api.js';
import { fetchAllPages } from './paged.js';

const EXPORT_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'transfers',
  'budgets',
  'goals',
  'goal_contributions',
  'recurring_transactions',
  'notifications',
];

// Everything the signed-in user owns (row-level security limits each query to their rows).
export async function exportAllData() {
  const profile = unwrap(await supabase.from('profiles').select('*').single());
  const data = { exported_at: new Date().toISOString(), app: 'CüS Treasure', profile };
  for (const table of EXPORT_TABLES) {
    data[table] = await fetchAllPages(() => supabase.from(table).select('*').order('created_at').order('id'));
  }
  return data;
}

export async function getCounts() {
  const count = async (table) => {
    const { count: n, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const [accounts, transactions, goals] = await Promise.all([count('accounts'), count('transactions'), count('goals')]);
  return { accounts, transactions, goals };
}

// Permanently deletes the user and (by cascade) every record they own.
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message || 'Could not delete your account.');
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* the user no longer exists; the local session is cleared either way */
  }
}