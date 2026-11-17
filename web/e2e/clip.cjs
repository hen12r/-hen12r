// Finds visible elements whose right edge goes past the viewport (clipped content), on every page.
const { chromium, devices } = require('playwright');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const session = { access_token: `${b64({alg:'HS256'})}.${b64({sub:'1',exp})}.s`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: { id: '1', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };
(async () => {
  const b = await chromium.launch(); const out = {};
  for (const [dev, opts] of [['iphone-se', devices['iPhone SE']], ['iphone13', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 800 } }]]) {
    for (const lang of ['fr', 'en']) {
      const ctx = await b.newContext({ ...opts, locale: lang === 'fr' ? 'fr-FR' : 'en-US' });
      await ctx.route(/fonts\./, r => r.abort());
      await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: [] }));
      await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
      await ctx.route('**/functions/v1/scan/**', r => r.fulfill({ json: { status: 'not_configured' } }));
      await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: 1 }));
      await ctx.route('**/rest/v1/products**', r => r.fulfill({ json: [{ id: 'p1', asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe coucher de soleil avec un nom assez long pour tester', created_at: '2026-11-08T10:00:00Z', scans: [{ id: 's1', status: 'done', requested_at: '2026-11-07T10:00:00Z', completed_at: '2026-11-08T09:00:00Z', scan_findings: [{ count: 3 }] }] }] }));
      await ctx.route('**/rest/v1/scans**', r => r.fulfill({ json: [{ id: 's1', status: 'done', requested_at: '2026-11-07T10:00:00Z', completed_at: '2026-11-08T09:00:00Z', similar_count: 2, product: { asin: 'B09NNLSTGQ', marketplace: 'amazon.fr', label: 'Lampe' }, findings: [{ id: 'f1', match: 'full', platform: 'Temu', page_url: 'https://www.temu.com/a-very-long-path-that-should-truncate-nicely-on-small-screens.html', title: 'A very long listing title that should truncate on a small phone screen', image_url: null, asin: null }] }] }));
      const p = await ctx.newPage();
      for (const path of ['/', '/pricing', '/privacy', '/legal', '/login', '/nope', '/app', '/app/scans/s1']) {
        if (path === '/app') await p.evaluate(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
        await p.goto('http://localhost:4174' + path); await p.waitForLoadState('networkidle'); await p.locator('h1').first().waitFor();
        const clipped = await p.evaluate(() => {
          const vw = document.documentElement.clientWidth; const bad = [];
          for (const el of document.querySelectorAll('body *')) {
            if (el.closest('[aria-hidden="true"]')) continue;
            const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
            if (!r.width || cs.visibility === 'hidden' || cs.position === 'absolute' && r.right < 0) continue;
            if (r.right > vw + 1 && el.children.length === 0) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" right=${Math.round(r.right)} vw=${vw}`);
          }
          return bad.slice(0, 5);
        });
        if (clipped.length) out[`${dev}/${lang}${path}`] = clipped;
      }
      await ctx.close();
    }
  }
  console.log(Object.keys(out).length ? JSON.stringify(out, null, 1) : 'NO CLIPPED ELEMENTS on 8 pages × 3 screen sizes × 2 languages');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
