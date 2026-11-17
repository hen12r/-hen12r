// Runs every browser test against a production build served by `vite preview` on port 4174.
// All Supabase and Stripe calls are mocked inside the tests, so no keys or network are needed.
// Usage: npm run build && npm run e2e        (screenshots land in e2e/.out/)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const out = join(here, '.out');
mkdirSync(out, { recursive: true });

const SUITES = ['app', 'scan', 'billing', 'report-account-home', 'product-input', 'clip'];
const only = process.argv.slice(2);

// Run vite directly in its own process group so the whole server can be stopped at the end
// (killing an `npx` wrapper would leave vite running and keep the terminal's pipe open).
const preview = spawn(process.execPath, [join(web, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', '4174', '--strictPort'],
  { cwd: web, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const stopPreview = () => { try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stopPreview);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('vite preview did not start')), 30_000);
  preview.stdout.on('data', d => { if (String(d).includes('4174')) { clearTimeout(timer); resolve(); } });
  preview.on('exit', code => reject(new Error(`vite preview exited (${code})`)));
});

/** A suite passes when its JSON has no `false` value and no page errors; the clip check prints a sentence. */
function failures(name, stdout) {
  if (name === 'clip') return stdout.includes('NO CLIPPED ELEMENTS') ? [] : [stdout.trim()];
  const start = stdout.indexOf('{');
  if (start < 0) return ['no JSON output'];
  const res = JSON.parse(stdout.slice(start));
  const bad = Object.entries(res).filter(([, v]) => v === false).map(([k]) => `${k} = false`);
  if (Array.isArray(res.pageErrors) && res.pageErrors.length) bad.push(`page errors: ${res.pageErrors.join(' | ')}`);
  return bad;
}

let failed = 0;
try {
  for (const name of SUITES.filter(s => !only.length || only.includes(s))) {
    const started = Date.now();
    const child = spawn(process.execPath, [join(here, `${name}.cjs`), out], { cwd: web, stdio: ['ignore', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', d => { stdout += d; });
    const code = await new Promise(r => child.on('exit', r));
    const bad = code === 0 ? failures(name, stdout) : [`exit code ${code}`];
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (bad.length) { failed++; console.log(`✗ ${name} (${secs}s)\n  ${bad.join('\n  ')}`); }
    else console.log(`✓ ${name} (${secs}s)`);
  }
} finally {
  stopPreview();
}
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll suites passed');
process.exit(failed ? 1 : 0);
