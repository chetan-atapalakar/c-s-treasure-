import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';

export async function listRecurring() {
  return unwrap(await supabase.from('recurring_transactions').select('*').order('next_due'));
}

export async function createRecurring(values) {
  const user_id = await currentUserId();
  return unwrap(await supabase.from('recurring_transactions').insert({ ...values, user_id }).select().single());
}

export async function updateRecurring(id, values) {
  return unwrap(await supabase.from('recurring_transactions').update(values).eq('id', id).select().single());
}

// Past transactions already posted are kept (their recurring link is cleared).
export async function deleteRecurring(id) {
  unwrap(await supabase.from('recurring_transactions').delete().eq('id', id));
}

export async function listRecurringHistory(id, limit = 36) {
  return unwrap(
    await supabase
      .from('transactions')
      .select('*')
      .eq('recurring_id', id)
      .order('occurred_on', { ascending: false })
      .limit(limit)
  );
}

// Posts every due item exactly once (database enforces no duplicates). Returns how many were posted.
export async function runDueRecurring() {
  const { data, error } = await supabase.rpc('run_due_recurring');
  if (error) throw new Error(error.message);
  return data || 0;
}