#!/usr/bin/env node
// Scores a filled test sheet: fills wer, cer, accuracy_assessment and identified_errors for every row
// that has BOTH a human reference (expected_transcription) and a machine transcript (actual_transcription),
// then prints a summary broken down by language, category, speed and condition.
// Usage: node scripts/eval/score.mjs eval-data/test-sheet.csv [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv, toCsv } from './csv.mjs';
import { assess, cer, median, wer } from './metrics.mjs';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Usage: node scripts/eval/score.mjs <sheet.csv> [--write]'); process.exit(2); }
const text = readFileSync(file, 'utf8');
const header = text.replace(/^﻿/, '').split(/\r?\n/)[0].split(',');
const rows = parseCsv(text);

const scored = [];
for (const r of rows) {
  if (!r.expected_transcription?.trim() || !r.actual_transcription?.trim()) continue;
  const w = wer(r.expected_transcription, r.actual_transcription);
  r.wer = w.rate.toFixed(3);
  r.cer = cer(r.expected_transcription, r.actual_transcription).toFixed(3);
  r.accuracy_assessment = assess(w.rate);
  r.identified_errors = w.errors.slice(0, 12).join(' ; ') + (w.errors.length > 12 ? ` ; …(+${w.errors.length - 12})` : '');
  scored.push(r);
}

console.log(`Rows: ${rows.length} · scored: ${scored.length} · not yet scorable: ${rows.length - scored.length}`);
if (!scored.length) { console.log('Nothing to score yet — each row needs expected_transcription and actual_transcription.'); process.exit(0); }

const groupBy = (key) => {
  const g = new Map();
  for (const r of scored) { const k = r[key] || '(blank)'; g.set(k, [...(g.get(k) ?? []), r]); }
  return g;
};
const line = (label, list) => {
  const w = list.map((r) => Number(r.wer));
  const c = list.map((r) => Number(r.cer));
  return `  ${label.padEnd(22)} n=${String(list.length).padStart(3)}  median WER ${(median(w) * 100).toFixed(1).padStart(5)}%  median CER ${(median(c) * 100).toFixed(1).padStart(5)}%  good/usable ${list.filter((r) => ['good', 'usable-with-review'].includes(r.accuracy_assessment)).length}/${list.length}`;
};
console.log(line('ALL', scored));
for (const key of ['spoken_language', 'category', 'speed', 'condition', 'provider_model']) {
  console.log(`By ${key}:`);
  for (const [k, list] of groupBy(key)) console.log(line(k, list));
}
const speakers = new Set(scored.map((r) => r.speaker_id).filter(Boolean));
console.log(`Distinct speakers: ${speakers.size}`);

if (flag === '--write') { writeFileSync(file, toCsv(header, rows)); console.log(`Wrote scores back to ${file}`); }
