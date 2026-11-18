#!/usr/bin/env node
// Verifies the frontend Supabase configuration and that the backend is reachable.
// Reads .env.local (or the current environment). Never prints full key values.
// Usage: npm run check:env [-- --origin https://my-voice-life.vercel.app]
import { existsSync, readFileSync } from 'node:fs';
import { findPublicEnvProblems, jwtRole, mask } from './env-guard.mjs';

const args = process.argv.slice(2);
const origin = args[args.indexOf('--origin') + 1] && args.includes('--origin') ? args[args.indexOf('--origin') + 1] : 'http://localhost:3000';

const env = { ...process.env };
for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

let failed = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const bad = (msg) => { failed++; console.log(`  ✘ ${msg}`); };
const warn = (msg) => console.log(`  ! ${msg}`);

console.log('1. Public variables');
const url = env.VITE_SUPABASE_URL ?? '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
for (const p of findPublicEnvProblems(env)) bad(p);
if (/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url)) ok(`VITE_SUPABASE_URL = ${url}`);
else if (url) bad(`VITE_SUPABASE_URL has an unexpected format: ${url}`);
else bad('VITE_SUPABASE_URL is missing');
if (key.startsWith('sb_publishable_')) ok(`VITE_SUPABASE_PUBLISHABLE_KEY = ${mask(key)}`);
else if (jwtRole(key) === 'anon') ok(`VITE_SUPABASE_PUBLISHABLE_KEY is a legacy anon key ${mask(key)}`);
else if (key) bad('VITE_SUPABASE_PUBLISHABLE_KEY is not a publishable/anon key');
else bad('VITE_SUPABASE_PUBLISHABLE_KEY is missing');

if (!failed) {
  const base = url.replace(/\/$/, '');
  console.log('2. Supabase reachability');
  try {
    const res = await fetch(`${base}/auth/v1/health`, { headers: { apikey: key } });
    if (res.ok) ok(`Auth service healthy (HTTP ${res.status})`);
    else bad(`Auth health returned HTTP ${res.status}${res.status === 540 || res.status === 503 ? ' — is the project paused?' : ''}`);
  } catch (e) { bad(`Cannot reach ${base} (${e.cause?.code ?? e.message}) — project paused, deleted, or wrong URL?`); }

  try {
    const res = await fetch(`${base}/rest/v1/categories?select=id&limit=1`, { headers: { apikey: key } });
    // Anonymous callers must NOT see data. 401/403 or an empty list both prove RLS/grants hold.
    if (res.status === 401 || res.status === 403) ok(`Anonymous read of categories blocked (HTTP ${res.status})`);
    else if (res.ok) { const body = await res.json(); body.length === 0 ? ok('Anonymous read of categories returns no rows') : bad('Anonymous request returned category rows — RLS problem!'); }
    else if (res.status === 404) bad('Table categories not found — migration not applied yet');
    else warn(`categories probe returned HTTP ${res.status}`);
  } catch (e) { bad(`REST probe failed: ${e.message}`); }

  console.log(`3. Edge Function process-voice (CORS for ${origin})`);
  try {
    const res = await fetch(`${base}/functions/v1/process-voice`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } });
    const allow = res.headers.get('access-control-allow-origin');
    if (res.status === 404) bad('process-voice is not deployed');
    else if (allow === origin || allow === '*') ok(`Deployed; CORS allows ${origin}`);
    else bad(`Deployed but CORS allows "${allow}", not ${origin} — add it to the ALLOWED_ORIGINS secret`);
  } catch (e) { bad(`Function probe failed: ${e.message}`); }

  try {
    const res = await fetch(`${base}/functions/v1/process-voice`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: '{}' });
    if (res.status === 401) ok('Unauthenticated call rejected (HTTP 401)');
    else if (res.status === 404) bad('process-voice is not deployed');
    else bad(`Unauthenticated call returned HTTP ${res.status} — expected 401`);
  } catch (e) { bad(`Function auth probe failed: ${e.message}`); }
  warn('GEMINI_API_KEY cannot be checked from here (it is server-only). Verify by recording in the app: an "ai_not_configured" error means it is missing.');
}

console.log(failed ? `\n${failed} problem(s) found.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
