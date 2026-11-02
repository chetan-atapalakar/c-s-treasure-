import { supabase } from './supabase.js';
import { unwrap } from './api.js';

export async function listCategories() {
  return unwrap(await supabase.from('categories').select('*').order('kind').order('name'));
}