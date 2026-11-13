// Stripe helpers shared by the billing function (Deno) and its tests (Node).
// No SDK: plain fetch + Web Crypto, so it runs the same in both.

export const PLANS = {
  starter: { amount: 500, name: 'PhotoSentry Starter', products: 10 },
  pro: { amount: 1500, name: 'PhotoSentry Pro', products: 50 },
};

/** Encodes nested params the way Stripe's API expects (a[b][0][c]=...). */
export function formEncode(params, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') out.push(formEncode(value, name));
    else out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
  }
  return out.filter(Boolean).join('&');
}

/** Parameters for a subscription Checkout Session. Prices are defined inline, so nothing has to be created in the Stripe dashboard. */
export function checkoutParams({ plan, customerId, userId, siteUrl }) {
  const p = PLANS[plan];
  if (!p) throw new Error(`unknown plan: ${plan}`);
  return {
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    allow_promotion_codes: 'true',
    success_url: `${siteUrl}/app?checkout=success`,
    cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
    line_items: [{
      quantity: 1,
      price_data: { currency: 'eur', unit_amount: p.amount, recurring: { interval: 'month' }, product_data: { name: p.name } },
    }],
    subscription_data: { metadata: { user_id: userId, plan } },
    metadata: { user_id: userId, plan },
  };
}

async function hmacHex(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies a Stripe-Signature header ("t=...,v1=...,v1=...") against the raw body.
 * Rejects bad signatures and timestamps older than `toleranceSec` (replays).
 */
export async function verifyStripeSignature(rawBody, header, secret, { toleranceSec = 300, now = Date.now() / 1000 } = {}) {
  if (!header || !secret) return false;
  let t = null;
  const v1 = [];
  for (const item of header.split(',')) {
    const [k, v] = item.split('=');
    if (k === 't') t = Number(v);
    if (k === 'v1' && v) v1.push(v);
  }
  if (!t || !v1.length || Math.abs(now - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return v1.some(sig => safeEqual(sig, expected));
}

/** Maps a Stripe subscription object to a row of public.subscriptions, or null if it can't be attributed. */
export function subscriptionRow(sub) {
  const userId = sub?.metadata?.user_id;
  if (!userId) return null;
  const amount = sub.items?.data?.[0]?.price?.unit_amount;
  const plan = PLANS[sub.metadata.plan]
    ? sub.metadata.plan
    : Object.keys(PLANS).find(k => PLANS[k].amount === amount);
  if (!plan) return null;
  // Newer API versions moved current_period_end onto subscription items.
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  return {
    user_id: userId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    plan,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

/** Events that change a seller's subscription state. */
export const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);
