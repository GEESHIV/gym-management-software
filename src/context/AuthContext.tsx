import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Gym, Profile } from '@/lib/types';

export type AuthStatus = 'loading' | 'signed-out' | 'needs-gym' | 'ready' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  gym: Gym | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);

  const loadAccount = useCallback(async (userId: string) => {
    const { data: profileRow, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, gym_id, role, full_name, phone')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;

    if (!profileRow) {
      setProfile(null);
      setGym(null);
      setStatus('needs-gym');
      return;
    }

    const { data: gymRow, error: gymError } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', profileRow.gym_id)
      .maybeSingle();
    if (gymError) throw gymError;
    if (!gymRow) throw new Error('Your gym could not be found. Please contact support.');

    setProfile(profileRow as Profile);
    setGym(gymRow as Gym);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession);
        return;
      }
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setGym(null);
        setStatus('signed-out');
        return;
      }
      (async () => {
        try {
          await loadAccount(nextSession.user.id);
        } catch {
          setStatus('error');
        }
      })();
    });
    return () => subscription.subscription.unsubscribe();
  }, [loadAccount]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    if (!data.session) throw new Error('Your account was created but could not be signed in. Please sign in to continue.');
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!session) return;
    await loadAccount(session.user.id);
  }, [session, loadAccount]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, profile, gym, signIn, signUp, signOut, refreshAccount }),
    [status, session, profile, gym, signIn, signUp, signOut, refreshAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
