const { chromium } = require('playwright');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const session = { access_token: `${b64({alg:'HS256'})}.${b64({sub:USER.id,exp})}.sig`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };
const BASE = 'http://localhost:4174';

async function ctxFor(b, { signedIn, sub = null, limit = 1, products = [], checkout = { status: 200, json: { url: 'https://checkout.stripe.com/c/pay/test_123' } } }) {
  const ctx = await b.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } });
  const log = [];
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.route('https://checkout.stripe.com/**', r => { log.push('nav ' + r.request().url()); r.fulfill({ body: 'stripe checkout' }); });
  await ctx.route('https://billing.stripe.com/**', r => { log.push('nav ' + r.request().url()); r.fulfill({ body: 'stripe portal' }); });
  await ctx.route('**/auth/v1/otp**', r => { log.push('otp ' + r.request().url()); r.fulfill({ json: {} }); });
  await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: sub ? [sub] : [] }));
  await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
  await ctx.route('**/functions/v1/scan/**', r => r.fulfill({ json: { status: 'not_configured' } }));
  await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: limit }));
  await ctx.route('**/rest/v1/products**', r => {
    if (r.request().method() === 'POST') { log.push('add'); return r.fulfill({ status: 400, json: { code: 'P0001', message: 'plan_limit_reached', hint: 'Upgrade' } }); }
    r.fulfill({ json: products });
  });
  await ctx.route('**/functions/v1/billing/**', r => {
    const route = r.request().url().split('/').pop();
    log.push(`fn ${route} ${r.request().postData()} auth=${(r.request().headers()['authorization'] || '').startsWith('Bearer ')}`);
    if (route === 'portal') return r.fulfill({ json: { url: 'https://billing.stripe.com/p/session/test_456' } });
    r.fulfill({ status: checkout.status, json: checkout.json });
  });
  if (signedIn) await ctx.addInitScript(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  return { ctx, p, log, errs };
}

(async () => {
  const b = await chromium.launch(); const res = {}; const allErrs = [];
  const P1 = { id: 'p1', asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe', created_at: '2026-11-08T10:00:00Z', scans: [] };

  // 1. Logged out pricing
  let { ctx, p, log, errs } = await ctxFor(b, { signedIn: false });
  await p.goto(BASE + '/pricing'); await p.locator('h1').waitFor();
  res.planCount = await p.locator('main h2').count();
  res.testBanner = await p.getByText('Mode test').isVisible();
  res.title = await p.title();
  await p.getByRole('button', { name: 'Choisir Starter' }).click(); await p.waitForURL('**/login?next=*');
  res.loggedOutRedirect = new URL(p.url()).search;
  await p.fill('#login-email', 'seller@example.com'); await p.getByRole('button', { name: /lien de connexion/ }).click(); await p.getByText('Lien envoyé').waitFor();
  res.magicLinkRedirectsToPricing = decodeURIComponent(log.find(l => l.startsWith('otp')) || '').includes('/pricing');
  await p.goto(BASE + '/login?next=//evil.example'); await p.fill('#login-email', 'seller@example.com'); await p.getByRole('button', { name: /lien de connexion/ }).click(); await p.getByText('Lien envoyé').waitFor();
  res.openRedirectBlocked = !decodeURIComponent(log.filter(l => l.startsWith('otp')).pop()).includes('evil.example');
  allErrs.push(...errs); await ctx.close();

  // 2. Signed in, free: checkout starts with auth and the right plan, then navigates to Stripe
  ({ ctx, p, log, errs } = await ctxFor(b, { signedIn: true }));
  await p.goto(BASE + '/pricing'); await p.locator('h1').waitFor();
  res.freeMarkedCurrent = await p.getByRole('button', { name: 'Votre offre' }).isDisabled();
  await p.getByRole('button', { name: 'Choisir Pro' }).click(); await p.waitForURL('https://checkout.stripe.com/**');
  res.checkoutCall = log.find(l => l.startsWith('fn checkout'));
  allErrs.push(...errs); await ctx.close();

  // 3. Billing not configured yet
  ({ ctx, p, log, errs } = await ctxFor(b, { signedIn: true, checkout: { status: 503, json: { error: 'billing_not_configured' } } }));
  await p.goto(BASE + '/pricing'); await p.getByRole('button', { name: 'Choisir Starter' }).click();
  await p.getByRole('alert').waitFor(); res.notConfiguredMsg = await p.getByRole('alert').textContent();
  allErrs.push(...errs); await ctx.close();

  // 4. Free user at limit on dashboard
  ({ ctx, p, log, errs } = await ctxFor(b, { signedIn: true, products: [P1], limit: 1 }));
  await p.goto(BASE + '/app'); await p.getByText('Essai gratuit').waitFor();
  res.freeUsage = await p.getByText('1 / 1 produit').isVisible();
  res.addDisabledAtLimit = await p.locator('form:has(#p-asin) button[type=submit]').isDisabled();
  res.limitMessage = await p.getByText('Vous avez atteint la limite').isVisible();
  res.upgradeLink = await p.getByRole('link', { name: 'Voir les offres' }).getAttribute('href');
  allErrs.push(...errs); await ctx.close();

  // 5. Paying Pro user: card, renewal, portal
  ({ ctx, p, log, errs } = await ctxFor(b, { signedIn: true, products: [P1], limit: 50, sub: { plan: 'pro', status: 'active', current_period_end: '2026-12-10T12:00:00Z', cancel_at_period_end: false } }));
  await p.goto(BASE + '/app?checkout=success'); await p.getByText('Merci ! Votre paiement est reçu').waitFor();
  res.successBanner = true;
  res.queryCleared = !p.url().includes('checkout=');
  res.proCard = await p.getByText('1 / 50 produits').isVisible();
  res.renews = await p.getByText(/Renouvellement le 10 déc/).isVisible();
  await p.screenshot({ path: process.argv[2] + '/dashboard-pro.png' });
  await p.getByRole('button', { name: 'Gérer l’abonnement' }).click(); await p.waitForURL('https://billing.stripe.com/**');
  res.portalCall = log.find(l => l.startsWith('fn portal'));
  allErrs.push(...errs); await ctx.close();

  // 6. Paying user on pricing: no second checkout, button opens portal
  ({ ctx, p, log, errs } = await ctxFor(b, { signedIn: true, sub: { plan: 'starter', status: 'active', current_period_end: null, cancel_at_period_end: false } }));
  await p.goto(BASE + '/pricing'); await p.getByRole('button', { name: 'Votre offre' }).waitFor();
  await p.screenshot({ path: process.argv[2] + '/pricing-desktop.png', fullPage: true });
  await p.getByRole('button', { name: 'Gérer l’abonnement' }).click(); await p.waitForURL('https://billing.stripe.com/**');
  res.payingUsesPortalNotCheckout = log.some(l => l.startsWith('fn portal')) && !log.some(l => l.startsWith('fn checkout'));
  allErrs.push(...errs); await ctx.close();

  res.pageErrors = allErrs; await b.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
