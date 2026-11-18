#!/usr/bin/env node
// Runs recordings listed in a test sheet through Gemini using EXACTLY the production
// transcription prompt (supabase/functions/_shared/transcription.ts) and writes the result
// into actual_transcription / detected_language / provider_model.
//
// Requirements: Node 22.18+ (imports the shared .ts file directly).
// The API key is read from the GEMINI_API_KEY environment variable of YOUR shell only.
// Never put it in a file inside this repository and never paste it into chat or GitHub.
//
// Usage:
//   node scripts/eval/transcribe.mjs eval-data/test-sheet.csv --audio-dir eval-data/audio --dry-run
//   node scripts/eval/transcribe.mjs eval-data/test-sheet.csv --audio-dir eval-data/audio
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseCsv, toCsv } from './csv.mjs';
import { buildTranscriptionPrompt, TRANSCRIPT_SCHEMA } from '../../supabase/functions/_shared/transcription.ts';

const args = process.argv.slice(2);
const file = args[0];
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const audioDir = opt('--audio-dir', 'eval-data/audio');
const model = opt('--model', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
const dryRun = args.includes('--dry-run');
const overwrite = args.includes('--overwrite');
if (!file) { console.error('Usage: node scripts/eval/transcribe.mjs <sheet.csv> [--audio-dir dir] [--model m] [--dry-run] [--overwrite]'); process.exit(2); }

const MIME = { '.webm': 'audio/webm', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.aac': 'audio/aac' };
const HINT = { rw: 'rw', fr: 'fr', en: 'en' }; // mixed / code-switched rows use automatic detection

const text = readFileSync(file, 'utf8');
const header = text.replace(/^﻿/, '').split(/\r?\n/)[0].split(',');
const rows = parseCsv(text);
const todo = rows.filter((r) => r.audio_file && (overwrite || !r.actual_transcription));
console.log(`${todo.length} recording(s) to transcribe with ${model}${dryRun ? ' (dry run — nothing is sent)' : ''}`);

const key = process.env.GEMINI_API_KEY;
if (!dryRun && !key) { console.error('GEMINI_API_KEY is not set in this shell. See docs/kinyarwanda/TEST_PLAN.md.'); process.exit(2); }

let done = 0, failed = 0;
for (const r of todo) {
  const path = join(audioDir, r.audio_file);
  const mime = MIME[extname(path).toLowerCase()];
  if (!existsSync(path)) { console.log(`  ✘ ${r.recording_id}: file not found ${path}`); failed++; continue; }
  if (!mime) { console.log(`  ✘ ${r.recording_id}: unsupported type ${extname(path)}`); failed++; continue; }
  const hint = HINT[r.spoken_language] ?? 'auto';
  if (dryRun) { console.log(`  · ${r.recording_id}: ${path} (${mime}, hint=${hint})`); continue; }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inline_data: { mime_type: mime, data: readFileSync(path).toString('base64') } },
          { text: buildTranscriptionPrompt(hint) },
        ] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: TRANSCRIPT_SCHEMA },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const out = JSON.parse(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') || '{}');
    r.actual_transcription = (out.transcript ?? '').trim();
    r.detected_language = out.language ?? '';
    r.provider_model = `gemini:${model}`;
    console.log(`  ✔ ${r.recording_id} [${r.detected_language}] ${r.actual_transcription.slice(0, 70)}`);
    done++;
    writeFileSync(file, toCsv(header, rows)); // save progress after each clip
    await new Promise((s) => setTimeout(s, 1500)); // stay well inside free-tier rate limits
  } catch (e) {
    console.log(`  ✘ ${r.recording_id}: ${e.message}`);
    failed++;
  }
}
console.log(`Done: ${done} transcribed, ${failed} failed.${done ? ' Next: node scripts/eval/score.mjs ' + file + ' --write' : ''}`);
