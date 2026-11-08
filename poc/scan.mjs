#!/usr/bin/env node
// Usage: node scan.mjs <image file | image URL | folder>... [--own-asin B0XXXXXXXX]... [--own-domain mybrand.com]... [--out dir]
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { parseArgs } from 'node:util';
import { webDetect, findCopies } from './detect.mjs';
import { renderHtml, summarize } from './report.mjs';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

async function expandInputs(inputs) {
  const out = [];
  for (const input of inputs) {
    if (/^https?:\/\//i.test(input)) { out.push(input); continue; }
    const s = await stat(input);
    if (s.isDirectory()) {
      for (const name of (await readdir(input)).sort()) {
        if (IMAGE_EXT.has(extname(name).toLowerCase())) out.push(join(input, name));
      }
    } else {
      out.push(input);
    }
  }
  return out;
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'own-asin': { type: 'string', multiple: true, default: [] },
    'own-domain': { type: 'string', multiple: true, default: [] },
    out: { type: 'string', default: 'out' },
  },
});

if (!positionals.length) {
  console.error('Usage: node scan.mjs <image file | image URL | folder>... [--own-asin ASIN]... [--own-domain example.com]... [--out dir]');
  process.exit(1);
}

const own = { asins: values['own-asin'], domains: values['own-domain'] };
const inputs = await expandInputs(positionals);
const results = [];

for (const input of inputs) {
  process.stdout.write(`Scanning ${input} ... `);
  try {
    const r = findCopies(await webDetect(input), own);
    results.push({ input, ...r });
    console.log(`${r.findings.length} suspected copies`);
  } catch (e) {
    results.push({ input, error: e.message, findings: [], similarCount: 0, bestGuess: [] });
    console.log(`error: ${e.message}`);
  }
}

await mkdir(values.out, { recursive: true });
const scannedAt = new Date().toISOString();
await writeFile(join(values.out, 'report.json'), JSON.stringify({ scannedAt, own, results }, null, 2));
await writeFile(join(values.out, 'report.html'), renderHtml(results, scannedAt));

console.log('\nBy platform:');
console.table(summarize(results));
console.log(`Report: ${join(values.out, 'report.html')}`);
