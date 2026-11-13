import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findCopies } from './findcopies.js';
import { findCopies as pocFindCopies } from '../../../poc/detect.mjs';

const fixture = JSON.parse(await readFile(new URL('../../../poc/test/fixtures/web-detection.json', import.meta.url), 'utf8'));

test('function copy of findCopies matches the POC on the recorded fixture', () => {
  const own = { asins: ['B0OWNASIN1'], domains: ['mybrand.com'] };
  assert.deepEqual(findCopies(fixture, own), pocFindCopies(fixture, own));
});

test('function copy of the detection code stays identical to the POC source', async () => {
  const strip = s => s.slice(s.indexOf('/** Extracts the 10-character ASIN'));
  const fn = await readFile(new URL('./findcopies.js', import.meta.url), 'utf8');
  const poc = await readFile(new URL('../../../poc/detect.mjs', import.meta.url), 'utf8');
  assert.equal(strip(fn), strip(poc));
  const p1 = await readFile(new URL('./platforms.js', import.meta.url), 'utf8');
  const p2 = await readFile(new URL('../../../poc/platforms.mjs', import.meta.url), 'utf8');
  assert.equal(p1, p2);
});

test('per-product exclusion: a scan only excludes its own ASIN', () => {
  const r = findCopies(fixture, { asins: ['B0COPYCAT9'] });
  assert.ok(r.findings.some(f => f.pageUrl === 'https://www.amazon.fr/dp/B0OWNASIN1'));
  assert.ok(!r.findings.some(f => f.asin === 'B0COPYCAT9'));
});
