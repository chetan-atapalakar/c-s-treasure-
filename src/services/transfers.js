import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';

export async function listAccountTransfers(accountId, limit = 50) {
  return unwrap(
    await supabase
      .from('transfers')
      .select('*')
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

// One row moves money; both balances update through the derived view.
export async function createTransfer({ from_account_id, to_account_id, amount, note, occurred_on }) {
  const user_id = await currentUserId();
  return unwrap(
    await supabase
      .from('transfers')
      .insert({ user_id, from_account_id, to_account_id, amount, note, occurred_on })
      .select()
      .single()
  );
}

export async function deleteTransfer(id) {
  unwrap(await supabase.from('transfers').delete().eq('id', id));
}