// Billing endpoints for PhotoSentry: POST /billing/checkout, POST /billing/portal, POST /billing/webhook.
// Secrets (set in Supabase → Edge Functions → Secrets): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, optional SITE_URL.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { checkoutParams, formEncode, HANDLED_EVENTS, PLANS, subscriptionRow, verifyStripeSignature } from './stripe.js';

const env = (k: string) => Deno.env.get(k) ?? '';
const SITE_URL = env('SITE_URL') || 'https://photosentry.vercel.app';
const ALLOWED_ORIGINS = new Set([SITE_URL, 'http://localhost:5173', 'http://localhost:4174']);

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

async function stripe(path: string, method = 'GET', params?: Record<string, unknown>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? formEncode(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? 'error'}`);
  return data;
}

/** Service-role call to the database REST API (bypasses RLS; server only). */
async function db(path: string, init: RequestInit = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** Resolves the logged-in user from the request's access token. */
async function currentUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth } });
  if (!res.ok) return null;
  return await res.json();
}

async function existingSubscription(userId: string): Promise<{ stripe_customer_id: string; status: string } | null> {
  const rows = await db(`subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id,status`);
  return rows?.[0] ?? null;
}

async function existingCustomerId(userId: string): Promise<string | null> {
  return (await existingSubscription(userId))?.stripe_customer_id ?? null;
}

const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function handleCheckout(req: Request) {
  const user = await currentUser(req);
  if (!user) return json(req, 401, { error: 'not_signed_in' });
  const { plan } = await req.json().catch(() => ({}));
  if (typeof plan !== 'string' || !Object.hasOwn(PLANS, plan)) return json(req, 400, { error: 'unknown_plan' });

  const current = await existingSubscription(user.id);
  // Already paying: plan changes and cancellations go through the Stripe portal, never a second subscription.
  if (current && LIVE_STATUSES.has(current.status)) return json(req, 409, { error: 'already_subscribed' });

  let customerId = current?.stripe_customer_id ?? null;
  if (!customerId) {
    const found = await stripe(`customers/search?query=${encodeURIComponent(`metadata['user_id']:'${user.id}'`)}`);
    customerId = found.data?.[0]?.id ?? (await stripe('customers', 'POST', { email: user.email, metadata: { user_id: user.id } })).id;
  }
  const session = await stripe('checkout/sessions', 'POST', checkoutParams({ plan, customerId, userId: user.id, siteUrl: SITE_URL }));
  return json(req, 200, { url: session.url });
}

async function handlePortal(req: Request) {
  const user = await currentUser(req);
  if (!user) return json(req, 401, { error: 'not_signed_in' });
  const customerId = await existingCustomerId(user.id);
  if (!customerId) return json(req, 404, { error: 'no_subscription' });
  const session = await stripe('billing_portal/sessions', 'POST', { customer: customerId, return_url: `${SITE_URL}/app` });
  return json(req, 200, { url: session.url });
}

async function upsertFromSubscription(sub: Record<string, unknown>) {
  const row = subscriptionRow(sub);
  if (!row) { console.warn('Subscription without user_id/plan metadata', sub?.id); return; }
  await db('subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  });
}

async function handleWebhook(req: Request) {
  const raw = await req.text();
  const ok = await verifyStripeSignature(raw, req.headers.get('stripe-signature'), env('STRIPE_WEBHOOK_SECRET'));
  if (!ok) return new Response('invalid signature', { status: 400 });

  const event = JSON.parse(raw);
  if (!HANDLED_EVENTS.has(event.type)) return new Response('ignored', { status: 200 });

  const obj = event.data?.object ?? {};
  // Re-read the subscription from Stripe so the stored state is current, not the event snapshot.
  const subId = event.type === 'checkout.session.completed' ? obj.subscription : obj.id;
  if (subId) await upsertFromSubscription(await stripe(`subscriptions/${subId}`));
  return new Response('ok', { status: 200 });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });
  const route = new URL(req.url).pathname.split('/').pop();
  try {
    if (route === 'webhook') return await handleWebhook(req);
    if (!env('STRIPE_SECRET_KEY')) return json(req, 503, { error: 'billing_not_configured' });
    if (route === 'checkout') return await handleCheckout(req);
    if (route === 'portal') return await handlePortal(req);
    return json(req, 404, { error: 'not_found' });
  } catch (e) {
    console.error(route, e);
    return route === 'webhook' ? new Response('error', { status: 500 }) : json(req, 500, { error: 'server_error' });
  }
});
