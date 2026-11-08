import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Google sign-in stays hidden until the provider is configured in Supabase. */
export const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_GOOGLE_AUTH === 'true';

export const MARKETPLACES = ['amazon.fr', 'amazon.com', 'amazon.de', 'amazon.co.uk', 'amazon.es', 'amazon.it'] as const;
export type Marketplace = (typeof MARKETPLACES)[number];

export interface ScanRequest {
  email: string;
  asin: string;
  marketplace: Marketplace;
  locale: 'fr' | 'en';
  consent: true;
}

let client: Promise<SupabaseClient> | null = null;

/**
 * Loads supabase-js on first use, so the landing page doesn't ship it.
 * Sessions persist in localStorage; PKCE handles magic-link and OAuth redirects.
 */
export function getClient(): Promise<SupabaseClient> {
  if (!url || !key) return Promise.reject(new Error('Supabase env vars are not configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }));
  return client;
}

/** Inserts a free-scan request from the public form. No `.select()`: visitors have insert-only access. */
export async function submitScanRequest(req: ScanRequest): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from('scan_requests').insert(req);
  if (error) throw error;
}
