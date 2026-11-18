import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getProfile } from '../lib/api';
import type { Profile } from '../lib/types';
import { browserTimeZone } from '../lib/dates';

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Set when the user arrived through a password-recovery link. */
  recovering: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      // First sign-in: adopt the device time zone instead of the UTC default.
      if (p.timezone === 'UTC' && browserTimeZone() !== 'UTC') {
        const { data } = await supabase.from('profiles').update({ timezone: browserTimeZone() }).eq('id', p.id).select().single();
        setProfile((data as Profile) ?? p);
      } else {
        setProfile(p);
      }
    } catch (e) {
      console.error('Could not load profile', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') void loadProfile();
      if (event === 'SIGNED_OUT') { setProfile(null); setRecovering(false); }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value: AuthValue = {
    session, profile, loading, recovering,
    refreshProfile: loadProfile,
    setProfile,
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
