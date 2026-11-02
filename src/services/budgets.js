import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';
import { fetchAllPages } from './paged.js';

export async function listBudgets(month) {
  return unwrap(await supabase.from('budgets').select('*').eq('month', month));
}

// months in [from, toExclusive)
export async function listBudgetsBetween(from, toExclusive) {
  return unwrap(await supabase.from('budgets').select('*').gte('month', from).lt('month', toExclusive));
}

export async function listExpenseRows(from, toExclusive) {
  return fetchAllPages(() =>
    supabase
      .from('transactions')
      .select('id, category_id, amount, occurred_on')
      .eq('kind', 'expense')
      .gte('occurred_on', from)
      .lt('occurred_on', toExclusive)
      .order('occurred_on')
      .order('id')
  );
}

export async function createBudget({ category_id, month, limit_amount }) {
  const user_id = await currentUserId();
  return unwrap(await supabase.from('budgets').insert({ user_id, category_id, month, limit_amount }).select().single());
}

export async function updateBudget(id, { limit_amount }) {
  return unwrap(await supabase.from('budgets').update({ limit_amount }).eq('id', id).select().single());
}

export async function deleteBudget(id) {
  unwrap(await supabase.from('budgets').delete().eq('id', id));
}

// Copies budgets from one month into another, skipping categories already budgeted.
export async function copyBudgets(fromMonth, toMonth) {
  const [source, existing] = await Promise.all([listBudgets(fromMonth), listBudgets(toMonth)]);
  const taken = new Set(existing.map((b) => b.category_id));
  const user_id = await currentUserId();
  const rows = source
    .filter((b) => !taken.has(b.category_id))
    .map((b) => ({ user_id, category_id: b.category_id, month: toMonth, limit_amount: b.limit_amount }));
  if (rows.length === 0) return 0;
  unwrap(await supabase.from('budgets').insert(rows));
  return rows.length;
}