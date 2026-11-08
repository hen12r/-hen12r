#!/usr/bin/env node
// Turns one scanned image from report.json into SQL that publishes the results to a seller's scan.
// Usage: node to-sql.mjs out/report.json --scan <scan uuid> [--image 0]
// Run the printed SQL as the database admin (e.g. Supabase SQL editor). It marks the scan done.
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** SQL string literal, or NULL. */
export const lit = v => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

export function resultToSql(result, scanId) {
  if (!UUID_RE.test(scanId)) throw new Error(`--scan must be a UUID, got: ${scanId}`);
  const id = lit(scanId);
  const lines = ['begin;'];
  if (result.error) {
    lines.push(`update public.scans set status = 'failed', completed_at = now(), error = ${lit(result.error)} where id = ${id};`);
  } else {
    lines.push(`delete from public.scan_findings where scan_id = ${id};`);
    for (const f of result.findings ?? []) {
      lines.push(
        `insert into public.scan_findings (scan_id, user_id, match, platform, page_url, title, image_url, asin) ` +
        `select s.id, s.user_id, ${lit(f.match)}, ${lit(f.platform)}, ${lit(f.pageUrl)}, ${lit(f.title)}, ${lit(f.imageUrl)}, ${lit(f.asin)} ` +
        `from public.scans s where s.id = ${id};`);
    }
    lines.push(`update public.scans set status = 'done', completed_at = now(), similar_count = ${Number(result.similarCount) || 0}, error = null where id = ${id};`);
  }
  lines.push('commit;');
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { scan: { type: 'string' }, image: { type: 'string', default: '0' } },
  });
  if (!positionals[0] || !values.scan) {
    console.error('Usage: node to-sql.mjs out/report.json --scan <scan uuid> [--image 0]');
    process.exit(1);
  }
  const report = JSON.parse(await readFile(positionals[0], 'utf8'));
  const result = report.results?.[Number(values.image)];
  if (!result) { console.error(`No image #${values.image} in ${positionals[0]}`); process.exit(1); }
  console.log(resultToSql(result, values.scan));
}
