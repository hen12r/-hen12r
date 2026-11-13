import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; supabase: SupabaseClient }
  | { status: 'signed-in'; supabase: SupabaseClient; session: Session }
  | { status: 'error'; message: string };

/** Current session, kept in sync with Supabase auth events (login link, OAuth return, logout). */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    getClient().then(async supabase => {
      const apply = (session: Session | null) => {
        if (cancelled) return;
        setState(session ? { status: 'signed-in', supabase, session } : { status: 'signed-out', supabase });
      };
      const { data } = await supabase.auth.getSession();
      apply(data.session);
      const sub = supabase.auth.onAuthStateChange((_event, session) => apply(session));
      unsubscribe = () => sub.data.subscription.unsubscribe();
    }).catch(e => {
      if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return state;
}
