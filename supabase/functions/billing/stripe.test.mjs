import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { checkoutParams, formEncode, PLANS, subscriptionRow, verifyStripeSignature } from './stripe.js';

const SECRET = 'whsec_test_secret';
const sign = (body, t, secret = SECRET) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

test('formEncode produces Stripe-style nested keys', () => {
  const s = formEncode({ a: 1, b: { c: 'x y' }, d: [{ e: 2 }], skip: undefined });
  assert.equal(decodeURIComponent(s), 'a=1&b[c]=x y&d[0][e]=2');
});

test('checkoutParams builds a monthly EUR subscription with user metadata', () => {
  const p = checkoutParams({ plan: 'pro', customerId: 'cus_1', userId: 'u1', siteUrl: 'https://photosentry.vercel.app' });
  assert.equal(p.mode, 'subscription');
  assert.equal(p.line_items[0].price_data.unit_amount, 4900);
  assert.equal(p.line_items[0].price_data.currency, 'eur');
  assert.equal(p.line_items[0].price_data.recurring.interval, 'month');
  assert.deepEqual(p.subscription_data.metadata, { user_id: 'u1', plan: 'pro' });
  assert.equal(p.success_url, 'https://photosentry.vercel.app/app?checkout=success');
  assert.throws(() => checkoutParams({ plan: 'free', customerId: 'c', userId: 'u', siteUrl: 's' }), /unknown plan/);
});

test('verifyStripeSignature accepts a valid signature', async () => {
  const body = '{"id":"evt_1"}'; const t = 1_800_000_000;
  assert.equal(await verifyStripeSignature(body, sign(body, t), SECRET, { now: t + 10 }), true);
});

test('verifyStripeSignature accepts when one of several v1 signatures matches (secret rotation)', async () => {
  const body = '{}'; const t = 1_800_000_000;
  const header = `t=${t},v1=deadbeef,${sign(body, t).split(',')[1]}`;
  assert.equal(await verifyStripeSignature(body, header, SECRET, { now: t }), true);
});

test('verifyStripeSignature rejects tampered body, wrong secret, old timestamp, missing parts', async () => {
  const body = '{"amount":100}'; const t = 1_800_000_000;
  const header = sign(body, t);
  assert.equal(await verifyStripeSignature('{"amount":999}', header, SECRET, { now: t }), false, 'tampered body');
  assert.equal(await verifyStripeSignature(body, sign(body, t, 'whsec_other'), SECRET, { now: t }), false, 'wrong secret');
  assert.equal(await verifyStripeSignature(body, header, SECRET, { now: t + 301 }), false, 'replay after 5 min');
  assert.equal(await verifyStripeSignature(body, `t=${t}`, SECRET, { now: t }), false, 'no v1');
  assert.equal(await verifyStripeSignature(body, null, SECRET, { now: t }), false, 'no header');
  assert.equal(await verifyStripeSignature(body, header, '', { now: t }), false, 'no secret configured');
});

test('subscriptionRow maps a Stripe subscription (period end on items, newer API)', () => {
  const row = subscriptionRow({
    id: 'sub_1', customer: 'cus_1', status: 'active', cancel_at_period_end: false,
    metadata: { user_id: 'u1', plan: 'starter' },
    items: { data: [{ current_period_end: 1_800_000_000, price: { unit_amount: 1900 } }] },
  });
  assert.equal(row.user_id, 'u1');
  assert.equal(row.plan, 'starter');
  assert.equal(row.status, 'active');
  assert.equal(row.stripe_customer_id, 'cus_1');
  assert.equal(row.current_period_end, new Date(1_800_000_000 * 1000).toISOString());
});

test('subscriptionRow falls back to the price amount for the plan and handles expanded customer', () => {
  const row = subscriptionRow({
    id: 'sub_2', customer: { id: 'cus_2' }, status: 'canceled', cancel_at_period_end: true, current_period_end: 1_800_000_000,
    metadata: { user_id: 'u2' }, items: { data: [{ price: { unit_amount: PLANS.pro.amount } }] },
  });
  assert.equal(row.plan, 'pro');
  assert.equal(row.stripe_customer_id, 'cus_2');
  assert.equal(row.cancel_at_period_end, true);
});

test('subscriptionRow ignores subscriptions it cannot attribute', () => {
  assert.equal(subscriptionRow({ id: 's', metadata: {} }), null);
  assert.equal(subscriptionRow({ id: 's', metadata: { user_id: 'u' }, items: { data: [{ price: { unit_amount: 123 } }] } }), null);
});
