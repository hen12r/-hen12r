// Adding a product by pasting an Amazon link, short-link refusal, and the photo-link help.
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'seller@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const session = { access_token: `${b64({ alg: 'HS256' })}.${b64({ sub: USER.id, exp })}.s`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user: USER };

async function setup(browser, opts, lang = 'fr-FR') {
  const calls = [];
  let products = [{ id: 'p1', asin: 'B0CS3MVD98', marketplace: 'amazon.fr', label: 'Produit test', image_url: null, created_at: '2026-11-13T07:00:00Z', scans: [] }];
  const ctx = await browser.newContext({ locale: lang, viewport: { width: 1280, height: 900 }, ...opts });
  await ctx.route(/fonts\./, r => r.abort());
  await ctx.route('**/auth/v1/user**', r => r.fulfill({ json: USER }));
  await ctx.route('**/rest/v1/subscriptions**', r => r.fulfill({ json: [] }));
  await ctx.route('**/rest/v1/rpc/my_product_limit**', r => r.fulfill({ json: 10 }));
  await ctx.route('**/rest/v1/rpc/my_scan_interval_days**', r => r.fulfill({ json: 30 }));
  await ctx.route('**/rest/v1/scans**', r => r.fulfill({ json: [] }));
  await ctx.route('**/rest/v1/products**', r => {
    const m = r.request().method();
    if (m === 'GET') return r.fulfill({ json: products });
    if (m === 'POST') {
      const body = JSON.parse(r.request().postData()); calls.push(body);
      products = [{ id: 'p' + (products.length + 1), ...body, created_at: new Date().toISOString(), scans: [] }, ...products];
      return r.fulfill({ status: 201, body: '' });
    }
    return r.fulfill({ status: 204, body: '' });
  });
  await ctx.addInitScript(s => localStorage.setItem('sb-zgvftpdnqszkyyyognrv-auth-token', s), JSON.stringify(session));
  const page = await ctx.newPage();
  return { ctx, page, calls };
}

(async () => {
  const browser = await chromium.launch();
  const res = {}; const errs = [];

  let { ctx, page: p, calls } = await setup(browser, {});
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'Mes produits' }).waitFor();
  res.labelMentionsLink = (await p.locator('label[for=p-asin]').textContent()) === 'ASIN ou lien Amazon';

  // Full UK link: ASIN extracted, marketplace switched, confirmation shown
  await p.fill('#p-asin', 'https://www.amazon.co.uk/Sunset-Lamp/dp/B09NNLSTGQ/ref=sr_1_3?keywords=lamp');
  res.asinExtracted = (await p.inputValue('#p-asin')) === 'B09NNLSTGQ';
  res.marketplaceSwitched = (await p.inputValue('#p-market')) === 'amazon.co.uk';
  res.linkNote = (await p.locator('#p-link-note').textContent()) === 'Lien reconnu : ASIN B09NNLSTGQ sur amazon.co.uk.';
  await p.click('form button[type=submit]');
  await p.getByText('B09NNLSTGQ').first().waitFor();
  res.addedWithUkMarketplace = calls[0]?.asin === 'B09NNLSTGQ' && calls[0]?.marketplace === 'amazon.co.uk';
  res.noteClearedAfterAdd = (await p.locator('#p-link-note').count()) === 0;

  // Marketplace not in our list (amazon.ca): ASIN kept, marketplace untouched, explained
  await p.selectOption('#p-market', 'amazon.fr');
  await p.fill('#p-asin', 'https://www.amazon.ca/dp/B0FHK5WNVZ');
  res.otherMarketAsin = (await p.inputValue('#p-asin')) === 'B0FHK5WNVZ';
  res.otherMarketKeepsSelection = (await p.inputValue('#p-market')) === 'amazon.fr';
  res.otherMarketNote = /amazon\.ca n’est pas encore dans la liste/.test(await p.locator('#p-link-note').textContent());

  // Short link: refused with an explanation, field cleared
  await p.fill('#p-asin', 'https://amzn.eu/d/05Sr0Udq');
  res.shortLinkCleared = (await p.inputValue('#p-asin')) === '';
  res.shortLinkError = /liens courts/.test(await p.locator('#p-error').textContent());

  // Typing a plain ASIN still uppercases and caps at 10
  await p.fill('#p-asin', 'b0fhk5wnvzxx');
  res.plainAsinTyping = (await p.inputValue('#p-asin')) === 'B0FHK5WNVZ';

  // Non-Amazon link: kept as typed, refused on submit
  await p.fill('#p-asin', 'https://www.ebay.fr/itm/123');
  await p.click('form button[type=submit]');
  res.badLinkRefused = /lien complet de votre page produit Amazon/.test(await p.locator('#p-error').textContent());
  res.badLinkNotSent = calls.length === 1;

  // Photo help: in the add form and under the product that has no photo
  const helps = p.locator('summary', { hasText: 'Comment trouver le lien de la photo ?' });
  res.photoHelpCount = await helps.count(); // add form + 1 product without photo (+ the new one)
  await helps.first().click();
  res.photoHelpSteps = await p.locator('details[open] ol li').count();
  res.photoHelpExample = await p.locator('details[open]').getByText(/m\.media-amazon\.com\/images\/I\//).isVisible();
  await p.screenshot({ path: `${out}/product-input-fr.png`, fullPage: true });
  await ctx.close();

  // English + phone layout
  ({ ctx, page: p } = await setup(browser, devices['iPhone SE'], 'en-US'));
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4174/app'); await p.locator('h1', { hasText: 'My products' }).waitFor();
  await p.fill('#p-asin', 'amazon.de/gp/product/B0FHK5WNVZ');
  res.enLinkNote = (await p.locator('#p-link-note').textContent()) === 'Link recognised: ASIN B0FHK5WNVZ on amazon.de.';
  await p.locator('summary', { hasText: 'How do I find the photo link?' }).first().click();
  res.phoneNoOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await p.screenshot({ path: `${out}/product-input-phone-en.png`, fullPage: true });
  await ctx.close();

  res.pageErrors = errs;
  await browser.close();
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
