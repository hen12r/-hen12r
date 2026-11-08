import { useCallback, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase, supabaseService } from '../services/supabaseService';

/** Tracks the signed-in user's profile and keeps it in sync with Supabase auth. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabaseService.getProfile(session.user.id).then(setUser);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabaseService.getProfile(session.user.id).then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /** Persists one used scan / try-on and updates local state. */
  const recordScan = useCallback(async (current: User) => {
    await supabaseService.incrementUsage(current.id, current.photosUsed);
    setUser({ ...current, photosUsed: current.photosUsed + 1 });
  }, []);

  return { user, setUser, recordScan };
}
