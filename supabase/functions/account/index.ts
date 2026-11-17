// Account endpoint for PhotoSentry: POST /account/delete (self-service account deletion).
// Uses the optional STRIPE_SECRET_KEY secret to cancel a live subscription first.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

const env = (k: string) => Deno.env.get(k) ?? '';
const SITE_URL = env('SITE_URL') || 'https://photosentry.vercel.app';
const ALLOWED_ORIGINS = new Set([SITE_URL, 'http://localhost:5173', 'http://localhost:4174']);
const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });

const serviceHeaders = () => {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
};

/** Service-role call to the database REST API (bypasses RLS; server only). */
async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`DB ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function currentUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth } });
  if (!res.ok) return null;
  const user = await res.json();
  return typeof user?.id === 'string' ? user : null;
}

async function cancelStripeSubscription(id: string) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}` },
  });
  // 404: already gone on Stripe's side, which is what we want.
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? 'error'}`);
  }
}

async function handleDelete(req: Request) {
  const user = await currentUser(req);
  if (!user) return json(req, 401, { error: 'not_signed_in' });

  // 1. Never delete someone who would keep being billed.
  const subs = await db(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_subscription_id,status`);
  const live = (subs ?? []).find((s: { status: string }) => LIVE_STATUSES.has(s.status));
  if (live) {
    if (!env('STRIPE_SECRET_KEY')) return json(req, 409, { error: 'subscription_active' });
    if (live.stripe_subscription_id) await cancelStripeSubscription(live.stripe_subscription_id);
  }

  // 2. Free-scan requests are keyed by email, not user id.
  if (user.email) {
    await db(`scan_requests?email=eq.${encodeURIComponent(user.email)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }

  // 3. Delete the auth user; products, scans, findings and subscriptions cascade.
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', headers: serviceHeaders() });
  if (!res.ok) throw new Error(`Auth ${res.status}: ${await res.text()}`);
  return json(req, 200, { deleted: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });
  const route = new URL(req.url).pathname.split('/').pop();
  try {
    if (route === 'delete') return await handleDelete(req);
    return json(req, 404, { error: 'not_found' });
  } catch (e) {
    console.error(route, e);
    return json(req, 500, { error: 'server_error' });
  }
});
