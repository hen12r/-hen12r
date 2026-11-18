import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** False when the developer has not created a .env.local yet — the UI shows setup instructions. */
export const isSupabaseConfigured = Boolean(url && key);

// The publishable key is designed to be public; Row Level Security protects the data.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const functionsUrl = `${url ?? ''}/functions/v1`;
