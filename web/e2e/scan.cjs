const { chromium } = require('playwright');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const USER = { id: '1', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const session = { access_token: `${b64({alg:'HS256'})}.${b64({sub:'1',exp})}.s`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };
(async () => {
  const b = await chromium.launch(); const res = {}; const log = []; const errs = [];
  let products = [{ id: 'p1', asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe', image_url: null, created_at: '2026-11-08T10:00:00Z', scans: [] }];
  let tooSoon = false;
  const ctx = await b.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: [] }));
  await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: 10 }));
  await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
  await ctx.route('**/rest/v1/products**', r => {
    const m = r.request().method();
    if (m === 'GET') return r.fulfill({ json: products });
    if (m === 'POST') { const body = JSON.parse(r.request().postData()); log.push('add ' + JSON.stringify(body)); products = [{ id: 'p2', ...body, created_at: new Date().toISOString(), scans: [] }, ...products]; return r.fulfill({ status: 201, body: '' }); }
    if (m === 'PATCH') { const body = JSON.parse(r.request().postData()); log.push('patch ' + JSON.stringify(body)); products = products.map(p => r.request().url().includes(p.id) ? { ...p, ...body } : p); return r.fulfill({ status: 204, body: '' }); }
  });
  await ctx.route('**/rest/v1/scans**', r => {
    if (r.request().method() !== 'POST') return r.fulfill({ json: [] });
    log.push('scan ' + r.request().postData());
    if (tooSoon) return r.fulfill({ status: 400, json: { code: 'P0001', message: 'scan_too_soon', details: '2026-12-10T12:00:00Z', hint: null } });
    const id = JSON.parse(r.request().postData()).product_id;
    products = products.map(p => p.id === id ? { ...p, scans: [{ id: 's1', status: 'requested', requested_at: new Date().toISOString(), completed_at: null, scan_findings: [{ count: 0 }] }] } : p);
    r.fulfill({ status: 201, body: '' });
  });
  await ctx.route('**/functions/v1/scan/run', r => {
    log.push('run auth=' + (r.request().headers()['authorization'] || '').startsWith('Bearer '));
    products = products.map(p => p.scans[0]?.status === 'requested' && p.image_url ? { ...p, scans: [{ ...p.scans[0], status: 'done', completed_at: new Date().toISOString(), scan_findings: [{ count: 2 }] }] } : p);
    r.fulfill({ json: { status: 'ok', done: 1, failed: 0, waitingForImage: 0 } });
  });
  await ctx.addInitScript(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'Mes produits' }).waitFor();
  res.intervalShown = await p.getByText('Scan automatique chaque mois').first().isVisible();
  res.inlineImagePrompt = await p.getByPlaceholder('Ajouter le lien de la photo pour activer le scan automatique').isVisible();

  // bad image URL on add form
  await p.fill('#p-asin', 'B0FHK5WNVZ'); await p.fill('#p-image', 'http://not-https.example/a.jpg'); await p.click('form button[type=submit]');
  res.badImageError = await p.locator('#p-error').textContent();
  // valid add with image
  await p.fill('#p-image', 'https://m.media-amazon.com/images/I/61AYh7w7vGL.jpg'); await p.click('form button[type=submit]');
  await p.getByText('B0FHK5WNVZ').first().waitFor();
  res.addSentImage = log.find(l => l.startsWith('add'))?.includes('61AYh7w7vGL');

  // save image on existing product
  await p.getByPlaceholder('Ajouter le lien de la photo pour activer le scan automatique').fill('https://m.media-amazon.com/images/I/71Y0uXvJz8L.jpg');
  await p.getByRole('button', { name: 'Enregistrer' }).click();
  await p.getByPlaceholder('Ajouter le lien de la photo pour activer le scan automatique').waitFor({ state: 'detached' });
  res.imagePatched = log.find(l => l.startsWith('patch'))?.includes('71Y0uXvJz8L');

  // request scan → insert then run → report becomes available
  await p.locator('li', { hasText: 'Lampe' }).getByRole('button', { name: 'Demander un scan' }).click();
  await p.locator('li', { hasText: 'Lampe' }).getByRole('link', { name: 'Voir le rapport' }).waitFor();
  res.scanInsertedThenRun = log.findIndex(l => l.startsWith('scan')) < log.findIndex(l => l.startsWith('run')) && log.some(l => l === 'run auth=true');
  res.copiesShown = await p.locator('li', { hasText: 'Lampe' }).getByText('2 copies').isVisible();
  res.nextAutoAfterScan = await p.locator('li', { hasText: 'Lampe' }).getByText(/Prochain scan automatique : /).textContent();
  res.neverScannedWithImage = await p.locator('li', { hasText: 'B0FHK5WNVZ' }).getByText('Scan automatique dans les prochaines 24 h').isVisible();

  // frequency refusal
  tooSoon = true;
  await p.locator('li', { hasText: 'B0FHK5WNVZ' }).getByRole('button', { name: 'Demander un scan' }).click();
  await p.getByRole('alert').waitFor(); res.tooSoonMsg = await p.getByRole('alert').textContent();
  await p.screenshot({ path: process.argv[2] + '/dashboard-scan.png', fullPage: true });
  res.pageErrors = errs; await b.close(); console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
