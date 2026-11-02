import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';

// Balances come from the account_balances view (derived, never stored).
export async function listAccounts() {
  return unwrap(await supabase.from('account_balances').select('*').order('created_at'));
}

export async function createAccount({ name, type, opening_balance }) {
  const user_id = await currentUserId();
  return unwrap(
    await supabase.from('accounts').insert({ user_id, name, type, opening_balance, is_manual: true }).select().single()
  );
}

export async function updateAccount(id, { name, type, opening_balance }) {
  return unwrap(await supabase.from('accounts').update({ name, type, opening_balance }).eq('id', id).select().single());
}

// Cascades to the account's transactions, transfers and recurring items.
export async function deleteAccount(id) {
  unwrap(await supabase.from('accounts').delete().eq('id', id));
}