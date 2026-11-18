import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { assertNoSecretsInPublicEnv } from './scripts/env-guard.mjs';

// Fails the build if a VITE_* variable is not on the allow-list or looks like a secret,
// so a misconfigured Vercel project or .env file can never ship a key to users.
function secretGuard(mode: string): Plugin {
  return {
    name: 'mvl-secret-guard',
    config() {
      assertNoSecretsInPublicEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...pickVite(process.env) });
    },
  };
}
function pickVite(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter(([k, v]) => k.startsWith('VITE_') && typeof v === 'string')) as Record<string, string>;
}

// `vite preview` serves the same security headers as Vercel, so CSP problems show up locally.
function vercelHeaders(): Record<string, string> {
  const cfg = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const rule = cfg.headers.find((h: { source: string }) => h.source === '/(.*)');
  return Object.fromEntries(rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]));
}

export default defineConfig(({ mode }) => ({
  plugins: [secretGuard(mode), react(), tailwindcss()],
  server: { port: 3000, host: '0.0.0.0' },
  preview: { port: 4173, headers: vercelHeaders() },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
}));
