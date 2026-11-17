const { chromium, devices } = require('playwright');
const out = process.argv[2];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const session = { access_token: `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:USER.id,role:'authenticated',aud:'authenticated',exp})}.s`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };

let products = [
  { id: 'p1', asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe coucher de soleil', created_at: '2026-11-08T10:00:00Z',
    scans: [{ id: 's1', status: 'done', requested_at: '2026-11-07T10:00:00Z', completed_at: '2026-11-08T09:00:00Z', scan_findings: [{ count: 3 }] }] },
  { id: 'p2', asin: 'B0CKWB2MY4', marketplace: 'amazon.fr', label: null, created_at: '2026-11-08T11:00:00Z',
    scans: [{ id: 's2', status: 'requested', requested_at: '2026-11-08T11:00:00Z', completed_at: null, scan_findings: [{ count: 0 }] }] },
];
const report = { id: 's1', status: 'done', requested_at: '2026-11-07T10:00:00Z', completed_at: '2026-11-08T09:00:00Z', similar_count: 12,
  product: { asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe coucher de soleil' },
  findings: [
    { id: 'f2', match: 'partial', platform: 'AliExpress', page_url: 'https://fr.aliexpress.com/item/1.html', title: 'Sunset lamp USB', image_url: 'https://ae01.alicdn.com/x.jpg', asin: null },
    { id: 'f1', match: 'full', platform: 'Temu', page_url: 'https://www.temu.com/x.html', title: 'Lampe projecteur', image_url: null, asin: null },
    { id: 'f3', match: 'full', platform: 'Other', page_url: 'javascript:alert(1)', title: 'Evil link', image_url: null, asin: null },
  ] };
const calls = [];

async function mock(ctx) {
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.route('**/auth/v1/otp**', r => { calls.push('otp ' + r.request().postData()); r.fulfill({ json: {} }); });
  await ctx.route('**/auth/v1/user**', r => r.fulfill({ json: USER }));
  await ctx.route('**/auth/v1/logout**', r => { calls.push('logout'); r.fulfill({ status: 204, body: '' }); });
  await ctx.route('**/rest/v1/products**', async r => {
    const m = r.request().method();
    if (m === 'GET') return r.fulfill({ json: products });
    if (m === 'POST') { const body = JSON.parse(r.request().postData()); calls.push('add ' + JSON.stringify(body));
      if (products.some(p => p.asin === body.asin && p.marketplace === body.marketplace)) return r.fulfill({ status: 409, json: { code: '23505', message: 'duplicate key' } });
      products = [{ id: 'p3', ...body, created_at: new Date().toISOString(), scans: [] }, ...products]; return r.fulfill({ status: 201, body: '' }); }
    if (m === 'DELETE') { calls.push('delete ' + r.request().url().split('id=eq.')[1]); products = products.filter(p => !r.request().url().includes(p.id)); return r.fulfill({ status: 204, body: '' }); }
  });
  await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: [] }));
  await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
  await ctx.route('**/functions/v1/scan/**', r => r.fulfill({ json: { status: 'not_configured' } }));
  await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: 50 }));
  await ctx.route('**/rest/v1/scans**', async r => {
    const m = r.request().method();
    if (m === 'GET') return r.fulfill({ json: r.request().url().includes('id=eq.s1') ? [report] : [] });
    if (m === 'POST') { const body = JSON.parse(r.request().postData()); calls.push('scan ' + body.product_id);
      const p = products.find(x => x.id === body.product_id); p.scans.push({ id: 's9', status: 'requested', requested_at: new Date().toISOString(), completed_at: null, scan_findings: [{ count: 0 }] });
      return r.fulfill({ status: 201, body: '' }); }
  });
}

(async () => {
  const browser = await chromium.launch();
  const res = {};

  // 1. Logged out: /app redirects to /login; Google hidden; magic link
  let ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } }); await mock(ctx);
  let p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app'); await p.waitForURL('**/login');
  res.redirectToLogin = p.url().endsWith('/login');
  res.googleButtonHidden = (await p.getByText('Continuer avec Google').count()) === 0;
  await p.click('button[type=submit]'); res.badEmailError = await p.locator('#login-error').textContent();
  await p.fill('#login-email', 'seller@example.com'); await p.click('button[type=submit]');
  await p.getByText('Lien envoyé').waitFor(); await p.screenshot({ path: `${out}/login-sent-fr.png` });
  res.otpRedirect = /"email_redirect_to"|redirect_to/.test(calls.find(c => c.startsWith('otp')) || '') || calls.find(c => c.startsWith('otp'));
  await ctx.close();

  // 2. Logged in: dashboard
  for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['phone', devices['iPhone 13']]]) {
    ctx = await browser.newContext({ ...opts, locale: 'fr-FR' }); await mock(ctx);
    await ctx.addInitScript(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
    p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'Mes produits' }).waitFor(); await p.getByText('B0CKWB2MY4').first().waitFor();
    res[`${name}Overflow`] = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: `${out}/dashboard-${name}.png`, fullPage: true });
    if (name === 'desktop') {
      res.stats = await p.locator('main').getByText('Produits suivis').locator('../..').innerText();
      res.openScanButtonDisabled = await p.locator('li', { hasText: 'B0CKWB2MY4' }).getByRole('button', { name: 'Scan en cours' }).isDisabled();
      await p.fill('#p-asin', 'bad'); await p.click('form button[type=submit]'); res.badAsinError = await p.locator('#p-error').textContent();
      await p.fill('#p-asin', 'B09NNLSTGQ'); await p.click('form button[type=submit]'); await p.locator('#p-error').waitFor(); res.duplicateError = await p.locator('#p-error').textContent();
      await p.fill('#p-asin', 'b0fhk5wnvz'); await p.fill('#p-label', 'CORATED'); await p.click('form button[type=submit]');
      await p.getByText('CORATED').first().waitFor(); res.added = true;
      await p.locator('li', { hasText: 'CORATED' }).getByRole('button', { name: 'Demander un scan' }).click();
      await p.locator('li', { hasText: 'CORATED' }).getByRole('button', { name: 'Scan en cours' }).waitFor(); res.scanRequested = true;
      p.once('dialog', d => d.accept());
      await p.locator('li', { hasText: 'CORATED' }).getByRole('button', { name: 'Supprimer' }).click();
      await p.getByText('CORATED').waitFor({ state: 'detached' }); res.deleted = true;
      // report
      await p.getByRole('link', { name: 'Voir le rapport' }).click(); await p.waitForURL('**/app/scans/s1');
      await p.getByText('Rapport de scan').waitFor();
      res.reportStats = await p.locator('main .grid-cols-3').first().innerText();
      const rows = p.locator('main ul.divide-y li'); res.firstFindingIsExact = (await rows.first().textContent()).includes('Copie exacte');
      await p.getByRole('tab', { name: /Retouchées/ }).click(); res.filterEditedCount = await rows.count();
      await p.getByRole('tab', { name: /Toutes/ }).click(); res.filterAllCount = await rows.count();
      res.platformBars = await p.locator('main h2', { hasText: 'Par plateforme' }).locator('..').locator('li').count();
      res.javascriptLinkNotRendered = (await p.locator('a[href^="javascript"]').count()) === 0;
      res.externalLinksSafe = await p.locator('main li a[target=_blank]').evaluateAll(as => as.every(a => a.rel.includes('noopener')));
      await p.screenshot({ path: `${out}/report-desktop.png`, fullPage: true });
      // language toggle on report
      await p.getByRole('button', { name: /Langue/ }).click(); res.reportEnTitle = await p.locator('h1').textContent();
      // direct deep link works (SPA rewrite in preview)
      await p.goto('http://localhost:4174/app/scans/s1'); await p.getByText('Scan report').waitFor(); res.deepLink = true;
      await p.goto('http://localhost:4174/app/scans/unknown'); await p.getByText('Report not found.').waitFor(); res.notFound = true;
      // logout
      await p.goto('http://localhost:4174/app'); await p.getByRole('button', { name: 'Account menu' }).click(); await p.getByRole('menuitem', { name: 'Log out' }).click(); await p.waitForURL('**/login'); res.logout = true;
      // landing header shows Log in after logout
      await p.goto('http://localhost:4174/'); res.landingHeaderLink = await p.locator('header a[href="/login"], header a[href="/app"]').first().textContent();
    }
    await ctx.close();
  }
  res.calls = calls; res.pageErrors = errs;
  await browser.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
