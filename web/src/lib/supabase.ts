import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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

/** Loads supabase-js only when the form is submitted, keeping it out of the first page load. */
function getClient(): Promise<SupabaseClient> {
  if (!url || !key) return Promise.reject(new Error('Supabase env vars are not configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: false } }));
  return client;
}

/** Inserts a free-scan request. No `.select()`: visitors have insert-only access. */
export async function submitScanRequest(req: ScanRequest): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from('scan_requests').insert(req);
  if (error) throw error;
}
