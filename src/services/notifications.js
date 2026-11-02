import { supabase } from './supabase.js';
import { currentUserId } from './api.js';

const seen = new Set();

// Creates a notification once per unique title (safe to call repeatedly).
export async function ensureNotification({ title, body = '', kind = 'info' }) {
  if (seen.has(title)) return;
  seen.add(title);
  try {
    const { data } = await supabase.from('notifications').select('id').eq('title', title).limit(1);
    if (data && data.length > 0) return;
    const user_id = await currentUserId();
    await supabase.from('notifications').insert({ user_id, title, body, kind });
  } catch {
    seen.delete(title);
  }
}