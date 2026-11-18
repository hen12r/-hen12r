import { describe, expect, it } from 'vitest';
import { findPublicEnvProblems, jwtRole, looksSecret, mask } from './env-guard.mjs';

const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`;

describe('env guard', () => {
  it('accepts the two public Supabase values', () => {
    expect(findPublicEnvProblems({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc', PATH: '/bin' })).toEqual([]);
  });
  it('accepts a legacy anon JWT but rejects a service_role JWT', () => {
    expect(jwtRole(jwt('anon'))).toBe('anon');
    expect(looksSecret(jwt('anon'))).toBe(false);
    expect(looksSecret(jwt('service_role'))).toBe(true);
  });
  it('rejects any VITE_GEMINI_API_KEY even if empty, and secret-looking values in allowed names', () => {
    expect(findPublicEnvProblems({ VITE_GEMINI_API_KEY: '' })).toHaveLength(1);
    expect(findPublicEnvProblems({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })[0]).toMatch(/secret/);
    expect(findPublicEnvProblems({ VITE_SUPABASE_PUBLISHABLE_KEY: 'AIzaSyA1234567890abcdefghijklmn' })[0]).toMatch(/secret/);
  });
  it('ignores non-VITE variables (server secrets are allowed to exist in the build env)', () => {
    expect(findPublicEnvProblems({ GEMINI_API_KEY: 'AIzaSyA1234567890abcdefghijklmn' })).toEqual([]);
  });
  it('masks values', () => {
    expect(mask('sb_publishable_abcdefghijklmnop')).toBe('sb_publishab… (31 chars)');
    expect(mask('short')).toBe('***');
  });
});
