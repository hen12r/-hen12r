import type { SupabaseClient } from '@supabase/supabase-js';

export class AccountError extends Error {
  constructor(public code: string) { super(code); }
}

/** Deletes the signed-in user's account and all their data (cancels a live subscription first), then signs out locally. */
export async function deleteAccount(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.functions.invoke('account/delete', { body: {} });
  if (error) {
    let code = 'server_error';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) code = (await ctx.json())?.error ?? code;
    } catch { /* keep default */ }
    throw new AccountError(code);
  }
  if (data?.deleted !== true) throw new AccountError('server_error');
  // The user no longer exists server-side; only the local session needs clearing.
  await supabase.auth.signOut({ scope: 'local' });
}
