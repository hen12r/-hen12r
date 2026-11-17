// Run with: node --test src/lib/amazon.test.ts  (Node 22.18+ strips the types)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeLink, parseAmazonInput } from './amazon.ts';

const ok = (asin: string, marketplace: string | null) => ({ kind: 'asin', asin, marketplace });

test('bare ASINs, any case, trimmed', () => {
  assert.deepEqual(parseAmazonInput('B0CS3MVD98'), ok('B0CS3MVD98', null));
  assert.deepEqual(parseAmazonInput('  b0cs3mvd98 '), ok('B0CS3MVD98', null));
});

test('full product links on each marketplace', () => {
  assert.deepEqual(parseAmazonInput('https://www.amazon.fr/dp/B0CS3MVD98?ref=cm_sw_r_cso&th=1'), ok('B0CS3MVD98', 'amazon.fr'));
  assert.deepEqual(parseAmazonInput('https://www.amazon.co.uk/Some-Long-Title/dp/B09NNLSTGQ/ref=sr_1_3'), ok('B09NNLSTGQ', 'amazon.co.uk'));
  assert.deepEqual(parseAmazonInput('amazon.de/gp/product/B0FHK5WNVZ'), ok('B0FHK5WNVZ', 'amazon.de'));
  assert.deepEqual(parseAmazonInput('https://m.amazon.com/gp/aw/d/B0FHK5WNVZ'), ok('B0FHK5WNVZ', 'amazon.com'));
  assert.deepEqual(parseAmazonInput('https://www.amazon.com.be/dp/b0fhk5wnvz#reviews'), ok('B0FHK5WNVZ', 'amazon.com.be'));
});

test('short share links are recognised but not resolvable', () => {
  assert.deepEqual(parseAmazonInput('https://amzn.eu/d/05Sr0Udq'), { kind: 'short' });
  assert.deepEqual(parseAmazonInput('a.co/d/abc'), { kind: 'short' });
});

test('everything else is invalid', () => {
  for (const s of ['', 'B0CS3', 'B0CS3MVD98X', 'https://www.ebay.fr/dp/B0CS3MVD98', 'https://amazon.evil.com/dp/B0CS3MVD98',
    'https://www.amazon.fr/s?k=lampe', 'https://www.amazon.fr/dp/B0CS3MVD9', 'javascript:alert(1)', 'not a link']) {
    assert.equal(parseAmazonInput(s).kind, 'invalid', s);
  }
});

test('looksLikeLink', () => {
  assert.equal(looksLikeLink('B0CS3MV'), false);
  assert.equal(looksLikeLink('https://'), true);
  assert.equal(looksLikeLink('amazon.fr'), true);
});
