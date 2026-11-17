import { readFile } from 'node:fs/promises';

/**
 * Parses a product list: one `ASIN | label | image URL` per line.
 * Blank lines and lines starting with # are ignored.
 */
export function parseProducts(text) {
  const products = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('|').map(s => s.trim());
    if (parts.length !== 3) throw new Error(`Line ${i + 1}: expected "ASIN | label | image URL", got: ${line}`);
    const [asin, label, imageUrl] = parts;
    if (!/^[A-Z0-9]{10}$/i.test(asin)) throw new Error(`Line ${i + 1}: invalid ASIN "${asin}"`);
    if (!/^https?:\/\//i.test(imageUrl)) throw new Error(`Line ${i + 1}: image must be an http(s) URL`);
    products.push({ asin: asin.toUpperCase(), label, imageUrl });
  });
  return products;
}

export async function loadProducts(path) {
  return parseProducts(await readFile(path, 'utf8'));
}
