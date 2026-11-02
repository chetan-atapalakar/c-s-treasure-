import { supabase } from './supabase.js';
import { unwrap, currentUserId } from './api.js';

// goal_progress is a view: goals + saved (sum of contributions) + completed
export async function listGoals() {
  return unwrap(await supabase.from('goal_progress').select('*').order('created_at'));
}

export async function createGoal({ name, target_amount, target_date }) {
  const user_id = await currentUserId();
  return unwrap(await supabase.from('goals').insert({ user_id, name, target_amount, target_date }).select().single());
}

export async function updateGoal(id, { name, target_amount, target_date }) {
  return unwrap(await supabase.from('goals').update({ name, target_amount, target_date }).eq('id', id).select().single());
}

export async function deleteGoal(id) {
  unwrap(await supabase.from('goals').delete().eq('id', id));
}

// amount > 0 contributes, amount < 0 withdraws
export async function addContribution({ goal_id, amount, contributed_on, note }) {
  const user_id = await currentUserId();
  return unwrap(
    await supabase.from('goal_contributions').insert({ user_id, goal_id, amount, contributed_on, note }).select().single()
  );
}

export async function listContributions(goalId) {
  return unwrap(
    await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('contributed_on', { ascending: false })
      .order('created_at', { ascending: false })
  );
}

export async function deleteContribution(id) {
  unwrap(await supabase.from('goal_contributions').delete().eq('id', id));
}