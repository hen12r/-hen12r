import type { SupabaseClient } from '@supabase/supabase-js';

export type PaidPlan = 'starter' | 'pro';

/** Shown on the pricing page while Stripe runs with test keys. */
export const STRIPE_TEST_MODE = import.meta.env.VITE_STRIPE_TEST_MODE !== 'false';

export class BillingError extends Error {
  constructor(public code: string) { super(code); }
}

/** Calls the `billing` edge function; the user's access token is attached by supabase-js. */
async function call(supabase: SupabaseClient, route: 'checkout' | 'portal', body?: unknown): Promise<string> {
  const { data, error } = await supabase.functions.invoke(`billing/${route}`, { body: body ?? {} });
  if (error) {
    let code = 'server_error';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) code = (await ctx.json())?.error ?? code;
    } catch { /* keep default */ }
    throw new BillingError(code);
  }
  if (!data?.url || typeof data.url !== 'string' || !data.url.startsWith('https://')) throw new BillingError('server_error');
  return data.url;
}

/** Sends the browser to Stripe Checkout for a plan. */
export async function startCheckout(supabase: SupabaseClient, plan: PaidPlan) {
  window.location.assign(await call(supabase, 'checkout', { plan }));
}

/** Sends the browser to the Stripe customer portal (change plan, cancel, invoices). */
export async function openPortal(supabase: SupabaseClient) {
  window.location.assign(await call(supabase, 'portal'));
}
