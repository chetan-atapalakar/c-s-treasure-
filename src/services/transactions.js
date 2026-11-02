import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const SORTS = {
  date_desc: [['occurred_on', false], ['created_at', false]],
  date_asc: [['occurred_on', true], ['created_at', true]],
  amount_desc: [['amount', false], ['occurred_on', false]],
  amount_asc: [['amount', true], ['occurred_on', false]],
};

export async function listTransactions({ filters = {}, page = 0, pageSize = 25 } = {}) {
  let q = supabase.from('transactions').select('*', { count: 'exact' });
  if (filters.q?.trim()) q = q.ilike('description', `%${escapeLike(filters.q.trim())}%`);
  if (filters.kind) q = q.eq('kind', filters.kind);
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.accountId) q = q.eq('account_id', filters.accountId);
  if (filters.from) q = q.gte('occurred_on', filters.from);
  if (filters.to) q = q.lte('occurred_on', filters.to);
  for (const [col, asc] of SORTS[filters.sort] || SORTS.date_desc) q = q.order(col, { ascending: asc });
  const from = page * pageSize;
  const { data, error, count } = await q.range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: data || [], count: count ?? 0 };
}

export async function listAccountTransactions(accountId, limit = 50) {
  return unwrap(
    await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

export async function createTransaction(values) {
  const user_id = await currentUserId();
  return unwrap(await supabase.from('transactions').insert({ ...values, user_id }).select().single());
}

export async function updateTransaction(id, values) {
  return unwrap(await supabase.from('transactions').update(values).eq('id', id).select().single());
}

export async function deleteTransaction(id) {
  unwrap(await supabase.from('transactions').delete().eq('id', id));
}