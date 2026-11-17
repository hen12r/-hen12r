// Takedown generator, CSV evidence, account deletion, home CTA, /legal.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const session = { access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: USER.id, exp })}.s`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };
const report = { id: 's1', status: 'done', requested_at: '2026-11-07T10:00:00Z', completed_at: '2026-11-08T09:00:00Z', similar_count: 0,
  product: { asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe coucher de soleil', image_url: 'https://m.media-amazon.com/images/I/orig.jpg' },
  findings: [
    { id: 'f1', match: 'full', platform: 'Amazon', page_url: 'https://www.amazon.fr/dp/B0COPY0001', title: 'Copie Amazon', image_url: 'https://m.media-amazon.com/images/I/copy.jpg', asin: 'B0COPY0001' },
    { id: 'f2', match: 'partial', platform: 'Temu', page_url: 'https://www.temu.com/x.html', title: '=HYPERLINK("evil")', image_url: null, asin: null },
    { id: 'f3', match: 'full', platform: 'Other', page_url: null, title: null, image_url: 'https://cdn.example/img.jpg', asin: null },
  ] };

async function setup(browser, opts = {}, { subscription = [], deleteStatus = 200 } = {}) {
  const calls = [];
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], ...opts });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.route('**/auth/v1/user**', r => r.fulfill({ json: USER }));
  await ctx.route('**/auth/v1/logout**', r => { calls.push('logout ' + r.request().url()); r.fulfill({ status: 204, body: '' }); });
  await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: subscription }));
  await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: 1 }));
  await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
  await ctx.route('**/rest/v1/products**', r => r.fulfill({ json: [] }));
  await ctx.route('**/rest/v1/scans**', r => { calls.push('scans ' + decodeURIComponent(r.request().url())); r.fulfill({ json: r.request().url().includes('id=eq.s1') ? [report] : [] }); });
  await ctx.route('**/functions/v1/account/delete', r => {
    calls.push(`delete method=${r.request().method()} auth=${(r.request().headers()['authorization'] || '').startsWith('Bearer ')}`);
    r.fulfill(deleteStatus === 200 ? { json: { deleted: true } } : { status: deleteStatus, json: { error: 'subscription_active' } });
  });
  await ctx.addInitScript(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
  const page = await ctx.newPage();
  return { ctx, page, calls };
}

(async () => {
  const browser = await chromium.launch();
  const res = {}; const errs = [];

  // 1. Report: takedown + CSV
  let { ctx, page: p, calls } = await setup(browser);
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app/scans/s1'); await p.getByText('Rapport de scan').waitFor();
  res.reportSelectsProductImage = calls.some(c => c.includes('image_url') && c.includes('products('));
  res.takedownButtons = await p.getByRole('button', { name: 'Préparer la demande de retrait' }).count(); // 2 (f3 has no page)
  const [csvDl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Télécharger les preuves (CSV)' }).click()]);
  const csv = fs.readFileSync(await csvDl.path(), 'utf8');
  res.csvName = csvDl.suggestedFilename();
  res.csvRows = csv.trim().split('\n').length; // header + 3
  res.csvFormulaEscaped = csv.includes(`"'=HYPERLINK(""evil"")"`);
  res.csvHasDate = csv.includes('2026-11-08T09:00:00.000Z');

  await p.locator('li', { hasText: 'Copie Amazon' }).getByRole('button', { name: 'Préparer la demande de retrait' }).click();
  const dialog = p.getByRole('dialog');
  await dialog.waitFor();
  let body = await dialog.locator('textarea').inputValue();
  res.bodyHasOriginal = body.includes('https://www.amazon.fr/dp/B09NNLSTGQ') && body.includes('orig.jpg');
  res.bodyHasCopy = body.includes('https://www.amazon.fr/dp/B0COPY0001') && body.includes('B0COPY0001');
  res.bodyHasDate = body.includes('8 novembre 2026');
  res.bodyPlaceholderName = body.includes('[Votre nom]');
  await dialog.getByLabel('Votre nom ou votre marque (facultatif)').fill('Lumio SAS');
  body = await dialog.locator('textarea').inputValue();
  res.bodyUsesName = body.includes('Je suis Lumio SAS') && !body.includes('[Votre nom]');
  res.amazonFormHref = await dialog.getByRole('link', { name: /Signaler une infraction/ }).getAttribute('href');
  await dialog.getByRole('button', { name: 'Copier le texte' }).click();
  await dialog.getByRole('button', { name: 'Copié !' }).waitFor();
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  res.clipboardHasSubjectAndName = clip.startsWith('Violation de droit d’auteur : photo copiée de l’ASIN B09NNLSTGQ') && clip.includes('Lumio SAS');
  const [txtDl] = await Promise.all([p.waitForEvent('download'), dialog.getByRole('button', { name: 'Télécharger (.txt)' }).click()]);
  res.txtName = txtDl.suggestedFilename();
  res.txtMatches = fs.readFileSync(await txtDl.path(), 'utf8').includes('Lumio SAS');
  await p.screenshot({ path: `${out}/takedown-fr.png` });
  await p.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' }); res.escCloses = true;

  // Temu: no guessed form link, generic instruction instead
  await p.locator('li', { hasText: 'Temu' }).getByRole('button', { name: 'Préparer la demande de retrait' }).click();
  res.temuNoFormLink = (await p.getByRole('dialog').getByRole('link').count()) === 0;
  res.temuOtherForm = await p.getByRole('dialog').getByText(/formulaire de propriété intellectuelle ou de signalement de Temu/).isVisible();
  res.temuEdited = (await p.getByRole('dialog').locator('textarea').inputValue()).includes('recadrée ou retouchée');
  await p.getByRole('dialog').getByRole('button', { name: 'Fermer' }).click();

  // English
  await p.getByRole('button', { name: /Langue/ }).click();
  await p.locator('li', { hasText: 'Copie Amazon' }).getByRole('button', { name: 'Prepare a takedown request' }).click();
  const en = await p.getByRole('dialog').locator('textarea').inputValue();
  res.enBody = en.startsWith('Hello,') && en.includes('8 November 2026') && en.includes('[Your name]');
  await p.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await ctx.close();

  // Phone layout of the panel
  ({ ctx, page: p } = await setup(browser, { ...devices['iPhone SE'], locale: 'fr-FR' }));
  await p.goto('http://localhost:4174/app/scans/s1'); await p.getByText('Rapport de scan').waitFor();
  await p.locator('li', { hasText: 'Copie Amazon' }).getByRole('button', { name: 'Préparer la demande de retrait' }).click();
  await p.getByRole('dialog').waitFor();
  res.phoneDialogFits = await p.getByRole('dialog').evaluate(d => { const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.top >= 0; });
  res.phoneButtonsVisible = await p.getByRole('button', { name: 'Copier le texte' }).isVisible();
  await p.screenshot({ path: `${out}/takedown-phone.png` });
  await ctx.close();

  // 2. Delete account: happy path
  ({ ctx, page: p, calls } = await setup(browser));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'Mes produits' }).waitFor();
  await p.getByText('Supprimer mon compte').click();
  const btn = p.getByRole('button', { name: 'Supprimer définitivement' });
  res.deleteDisabledInitially = await btn.isDisabled();
  await p.getByLabel('Tapez SUPPRIMER pour confirmer').fill('supprime');
  res.deleteDisabledWrongWord = await btn.isDisabled();
  await p.getByLabel('Tapez SUPPRIMER pour confirmer').fill('supprimer');
  res.deleteEnabledRightWord = await btn.isEnabled();
  await p.screenshot({ path: `${out}/delete-account.png`, fullPage: true });
  await btn.click();
  await p.waitForURL('http://localhost:4174/');
  res.deleteCall = calls.find(c => c.startsWith('delete'));
  res.doneBanner = await p.getByRole('status').textContent();
  res.sessionCleared = await p.evaluate(() => localStorage.getItem('sb-zgvftpdnqszkyyyognrv-auth-token') === null);
  res.localSignOutOnly = !calls.some(c => c.startsWith('logout') && !c.includes('scope=local'));
  await ctx.close();

  // 3. Delete account refused while subscribed and Stripe not configured
  ({ ctx, page: p } = await setup(browser, {}, { deleteStatus: 409 }));
  await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'Mes produits' }).waitFor();
  await p.getByText('Supprimer mon compte').click();
  await p.getByLabel('Tapez SUPPRIMER pour confirmer').fill('SUPPRIMER');
  await p.getByRole('button', { name: 'Supprimer définitivement' }).click();
  res.subscriptionActiveMsg = await p.locator('details [role=alert]').textContent();
  res.stayedOnApp = p.url().endsWith('/app');
  await ctx.close();

  // 4. Home: no form, CTAs to /login?next=/app; /legal
  ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 } });
  await ctx.route(/fonts\./, r => r.abort());
  p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/');
  res.homeNoForm = (await p.locator('main form').count()) === 0 && (await p.locator('#scan').count()) === 0;
  res.homeCtaHrefs = [...new Set(await p.locator('a[href*="/login?next"]').evaluateAll(as => as.map(a => a.getAttribute('href'))))];
  res.homeCtaCount = await p.locator('a[href="/login?next=/app"]').count();
  res.startSection = await p.locator('#start h2').textContent();
  await p.locator('#start').screenshot({ path: `${out}/home-start.png` });
  await p.locator('#start a').click(); await p.waitForURL('**/login?next=/app'); res.ctaGoesToLogin = true;
  await p.goto('http://localhost:4174/');
  await p.locator('footer').getByRole('link', { name: 'Mentions légales' }).click(); await p.waitForURL('**/legal'); await p.locator('h1', { hasText: 'Mentions légales' }).waitFor();
  res.legalTitle = await p.locator('h1').textContent();
  res.legalPendingCount = await p.getByText('En cours de complétion').count();
  res.legalHosts = await p.getByText(/Vercel Inc\.|Supabase Inc\./).count();
  await p.screenshot({ path: `${out}/legal-fr.png`, fullPage: true });
  await p.getByRole('button', { name: /Langue/ }).click(); res.legalEn = await p.locator('h1').textContent();
  await ctx.close();

  res.pageErrors = errs;
  await browser.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
