import { supabase } from './supabase.js';

function friendly(error) {
  switch (error?.code) {
    case '23503':
      return 'That record is linked to something that no longer exists. Refresh and try again.';
    case '23514':
      return 'One of the values is not allowed.';
    case '23505':
      return 'That already exists.';
    case '42501':
      return 'You do not have permission to do that.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}

export function unwrap({ data, error }) {
  if (error) throw new Error(friendly(error));
  return data;
}

export async function currentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('You are signed out. Please log in again.');
  return data.session.user.id;
}