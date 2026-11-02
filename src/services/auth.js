import { supabase } from './supabase.js';

const REMEMBER_KEY = 'cus.remember';
const ALIVE_KEY = 'cus.alive';

export function setRemember(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    sessionStorage.setItem(ALIVE_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

// "Remember me" off => session ends when the browser session ends.
export function shouldDropSession() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '0' && !sessionStorage.getItem(ALIVE_KEY);
  } catch {
    return false;
  }
}

export function friendlyAuthError(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Please verify your email first. Check your inbox.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('should be at least') || (m.includes('password') && m.includes('least'))) return 'Password is too short.';
  if (m.includes('same password')) return 'Choose a password different from your current one.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem. Check your connection and try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/login` },
  });
  if (error) throw error;
  return data; // data.session is null when email confirmation is required
}

export async function signIn({ email, password, remember }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  setRemember(remember);
  return data;
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}