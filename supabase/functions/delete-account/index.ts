// POST /functions/v1/delete-account  — permanently deletes the caller's account.
// All user data is removed by ON DELETE CASCADE from auth.users.
// Requires body { "confirm": "DELETE" } to avoid accidental calls.
import { createClient } from 'npm:@supabase/supabase-js@2.48.1';
import { corsHeaders, fail, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'POST only');

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return fail(req, 401, 'unauthorized', 'Sign in required');

  const body = await req.json().catch(() => null);
  if (body?.confirm !== 'DELETE') return fail(req, 400, 'confirmation_required', 'Send { "confirm": "DELETE" }');

  // The service-role key exists only inside the Edge Function runtime, never in the browser.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) {
    console.error('delete-account failed', delError);
    return fail(req, 500, 'delete_failed', 'Could not delete account');
  }
  return json(req, 200, { deleted: true });
});
