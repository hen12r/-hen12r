import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultToSql, lit } from '../to-sql.mjs';

const SCAN = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('lit escapes quotes and maps empty values to null', () => {
  assert.equal(lit("L'Oréal"), "'L''Oréal'");
  assert.equal(lit(null), 'null');
  assert.equal(lit(''), 'null');
});

test('resultToSql publishes findings and marks the scan done in one transaction', () => {
  const sql = resultToSql({
    findings: [{ match: 'full', platform: 'Temu', pageUrl: 'https://temu.com/x', title: "it's a copy", imageUrl: null, asin: null }],
    similarCount: 4,
  }, SCAN);
  const lines = sql.split('\n');
  assert.equal(lines[0], 'begin;');
  assert.equal(lines.at(-1), 'commit;');
  assert.match(sql, /delete from public\.scan_findings where scan_id = '0f8fad5b/);
  assert.match(sql, /'it''s a copy'/);
  assert.match(sql, /select s\.id, s\.user_id/);
  assert.match(sql, /status = 'done'.*similar_count = 4/);
});

test('resultToSql marks failed scans with the error', () => {
  const sql = resultToSql({ error: "Vision API 403: key's wrong", findings: [] }, SCAN);
  assert.match(sql, /status = 'failed'.*error = 'Vision API 403: key''s wrong'/);
  assert.doesNotMatch(sql, /insert into/);
});

test('resultToSql rejects a scan id that is not a UUID', () => {
  assert.throws(() => resultToSql({ findings: [] }, "x'; drop table scans; --"), /must be a UUID/);
});
