import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findCopies, asinOf, webDetect, toVisionImage } from '../detect.mjs';
import { platformOf } from '../platforms.mjs';
import { summarize, renderHtml } from '../report.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/web-detection.json', import.meta.url), 'utf8'));
const own = { asins: ['B0OWNASIN1'], domains: ['mybrand.com'] };

test('platformOf maps marketplaces and their image CDNs', () => {
  assert.equal(platformOf('https://www.amazon.co.uk/dp/B000000000'), 'Amazon');
  assert.equal(platformOf('https://m.media-amazon.com/images/I/x.jpg'), 'Amazon');
  assert.equal(platformOf('https://www.temu.com/x.html'), 'Temu');
  assert.equal(platformOf('https://img.kwcdn.com/a.jpg'), 'Temu');
  assert.equal(platformOf('https://fr.aliexpress.com/item/1.html'), 'AliExpress');
  assert.equal(platformOf('https://ae01.alicdn.com/kf/x.jpg'), 'Alibaba');
  assert.equal(platformOf('https://i.ebayimg.com/x.jpg'), 'eBay');
  assert.equal(platformOf('https://cdn.shopify.com/x.jpg'), 'Shopify store');
  assert.equal(platformOf('https://notamazon.com/x'), 'Other');
  assert.equal(platformOf('not a url'), 'Other');
});

test('asinOf reads ASINs from common Amazon URL shapes', () => {
  assert.equal(asinOf('https://www.amazon.com/Cheap-Bottle/dp/B0COPYCAT9?th=1'), 'B0COPYCAT9');
  assert.equal(asinOf('https://www.amazon.fr/gp/product/b0abcdefgh/'), 'B0ABCDEFGH');
  assert.equal(asinOf('https://www.amazon.de/gp/aw/d/B0ABCDEFGH'), 'B0ABCDEFGH');
  assert.equal(asinOf('https://www.temu.com/x.html'), null);
});

test("findCopies excludes the seller's own listing and domain", () => {
  const { findings } = findCopies(fixture, own);
  const pages = findings.map(f => f.pageUrl);
  assert.ok(!pages.includes('https://www.amazon.fr/dp/B0OWNASIN1'));
  assert.ok(!pages.includes('https://shop.mybrand.com/products/bottle'));
  // The own listing's image must not resurface as an image-only finding either.
  assert.ok(!findings.some(f => f.imageUrl === 'https://m.media-amazon.com/images/I/71own.jpg'));
});

test('findCopies flags another Amazon ASIN using the photo', () => {
  const copy = findCopies(fixture, own).findings.find(f => f.asin === 'B0COPYCAT9');
  assert.equal(copy.platform, 'Amazon');
  assert.equal(copy.match, 'full');
  assert.equal(copy.title, 'Cheap Bottle knockoff');
});

test('findCopies ranks exact marketplace copies first and blogs last', () => {
  const { findings } = findCopies(fixture, own);
  const order = findings.map(f => `${f.match}:${f.platform}`);
  assert.deepEqual(order.slice(0, 2).sort(), ['full:Amazon', 'full:Temu']);
  assert.equal(order.at(-1), 'partial:Other');
});

test('findCopies keeps matching images that have no page, without duplicates', () => {
  const { findings } = findCopies(fixture, own);
  const imageOnly = findings.filter(f => f.pageUrl === null).map(f => f.imageUrl);
  assert.deepEqual(imageOnly.sort(), [
    'https://ae01.alicdn.com/kf/Sxyz.jpg',
    'https://cdn.shopify.com/s/files/1/0001/products/bottle.jpg',
  ]);
  const urls = findings.map(f => f.imageUrl);
  assert.equal(new Set(urls).size, urls.length);
});

test('findCopies reports similar-image count and best guess but does not list them', () => {
  const r = findCopies(fixture, own);
  assert.equal(r.similarCount, 2);
  assert.deepEqual(r.bestGuess, ['insulated water bottle']);
  assert.ok(!r.findings.some(f => f.imageUrl?.startsWith('https://x.example')));
});

test('findCopies handles an empty Vision result', () => {
  assert.deepEqual(findCopies({}), { findings: [], similarCount: 0, bestGuess: [] });
});

test('toVisionImage sends URLs by reference and files as base64', async () => {
  assert.deepEqual(await toVisionImage('https://example.com/a.jpg'), { source: { imageUri: 'https://example.com/a.jpg' } });
  const dir = await mkdtemp(join(tmpdir(), 'poc-'));
  const file = join(dir, 'a.jpg');
  await writeFile(file, Buffer.from([1, 2, 3]));
  assert.deepEqual(await toVisionImage(file), { content: 'AQID' });
});

test('webDetect sends the key header and returns webDetection', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ responses: [{ webDetection: fixture }] }), { status: 200 });
  };
  const web = await webDetect('https://example.com/a.jpg', { apiKey: 'k', fetchImpl });
  assert.equal(seen.url, 'https://vision.googleapis.com/v1/images:annotate');
  assert.equal(seen.init.headers['x-goog-api-key'], 'k');
  assert.equal(JSON.parse(seen.init.body).requests[0].features[0].type, 'WEB_DETECTION');
  assert.equal(web.bestGuessLabels[0].label, 'insulated water bottle');
});

test('webDetect omits the key header when no key is set', async () => {
  let headers;
  const fetchImpl = async (_url, init) => { headers = init.headers; return new Response('{"responses":[{}]}'); };
  await webDetect('https://example.com/a.jpg', { apiKey: '', fetchImpl });
  assert.equal(headers['x-goog-api-key'], undefined);
});

test('webDetect surfaces HTTP and per-image API errors', async () => {
  const httpErr = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });
  await assert.rejects(webDetect('https://e.com/a.jpg', { apiKey: 'k', fetchImpl: httpErr }), /Vision API 400: API key not valid/);
  const imgErr = async () => new Response(JSON.stringify({ responses: [{ error: { message: 'Bad image data' } }] }));
  await assert.rejects(webDetect('https://e.com/a.jpg', { apiKey: 'k', fetchImpl: imgErr }), /Bad image data/);
});

test('report summarizes by platform and escapes HTML', () => {
  const r = findCopies(fixture, own);
  const results = [{ input: 'bottle.jpg', ...r }];
  const amazon = summarize(results).find(s => s.platform === 'Amazon');
  assert.deepEqual(amazon, { platform: 'Amazon', full: 1, partial: 0, total: 1 });
  const html = renderHtml([{ input: '<script>x</script>', findings: [], similarCount: 0, bestGuess: [] }]);
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('findCopies treats any URL containing the own ASIN as own', () => {
  const web = { pagesWithMatchingImages: [
    { url: 'https://www.amazon.fr/product-reviews/B09NNLSTGQ/', fullMatchingImages: [{ url: 'https://m.media-amazon.com/a.jpg' }] },
    { url: 'https://www.amazon.fr/dp/B0FHK5WNVZ', fullMatchingImages: [{ url: 'https://m.media-amazon.com/b.jpg' }] },
  ] };
  const { findings } = findCopies(web, { asins: ['B09NNLSTGQ'] });
  assert.deepEqual(findings.map(f => f.asin), ['B0FHK5WNVZ']);
});
