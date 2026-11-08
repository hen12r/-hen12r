import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProducts, loadProducts } from '../products.mjs';

test('parseProducts reads ASIN | label | URL lines and skips comments', () => {
  const list = parseProducts(`# header
b09nnlstgq | Sunset Lamp (lampe) | https://m.media-amazon.com/images/I/71Y0uXvJz8L.jpg

B0FHK5WNVZ | CORATED | https://m.media-amazon.com/images/I/61AYh7w7vGL.jpg`);
  assert.deepEqual(list, [
    { asin: 'B09NNLSTGQ', label: 'Sunset Lamp (lampe)', imageUrl: 'https://m.media-amazon.com/images/I/71Y0uXvJz8L.jpg' },
    { asin: 'B0FHK5WNVZ', label: 'CORATED', imageUrl: 'https://m.media-amazon.com/images/I/61AYh7w7vGL.jpg' },
  ]);
});

test('parseProducts rejects malformed lines with the line number', () => {
  assert.throws(() => parseProducts('B09NNLSTGQ | only two'), /Line 1: expected/);
  assert.throws(() => parseProducts('\nBAD | x | https://a/b.jpg'), /Line 2: invalid ASIN/);
  assert.throws(() => parseProducts('B09NNLSTGQ | x | /local.jpg'), /http\(s\) URL/);
});

test('the first-scan product list parses: 10 products, unique ASINs, + in URLs kept', async () => {
  const list = await loadProducts(new URL('../products/first-scan-fr.txt', import.meta.url));
  assert.equal(list.length, 10);
  assert.equal(new Set(list.map(p => p.asin)).size, 10);
  assert.ok(list.some(p => p.imageUrl.endsWith('61tbLA8BL+L.jpg')));
});
