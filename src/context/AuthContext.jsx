import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { shouldDropSession, signOutUser } from '../services/auth.js';
import { useTheme } from './ThemeContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setTheme } = useTheme();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('idle'); // idle | loading | ready | error
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId) => {
      setProfileStatus((s) => (s === 'ready' ? s : 'loading'));
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error || !data) {
        setProfileStatus('error');
        return null;
      }
      setProfile(data);
      setProfileStatus('ready');
      if (data.theme) setTheme(data.theme);
      return data;
    },
    [setTheme]
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session && shouldDropSession()) {
        await supabase.auth.signOut();
        if (active) setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setProfileStatus('idle');
      } else if (event !== 'TOKEN_REFRESHED') {
        // defer: never call supabase inside the auth callback directly
        setTimeout(() => loadProfile(next.user.id), 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session) return null;
    return loadProfile(session.user.id);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (patch) => {
      if (!session) return { data: null, error: new Error('Not signed in') };
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select().single();
      if (!error && data) {
        setProfile(data);
        if (patch.theme) setTheme(patch.theme);
      }
      return { data, error };
    },
    [session, setTheme]
  );

  const signOut = useCallback(async () => {
    await signOutUser();
    setProfile(null);
    setProfileStatus('idle');
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, profile, profileStatus, loading, refreshProfile, updateProfile, signOut }),
    [session, profile, profileStatus, loading, refreshProfile, updateProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}