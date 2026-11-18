// Pure origin matching (no Deno APIs) so it can be unit-tested.
// Entries are exact origins, or patterns where `*` matches one DNS label fragment
// (letters, digits, hyphens — never a dot), e.g. https://my-voice-life-*-henry7.vercel.app

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]*');
  return new RegExp(`^${escaped}$`);
}

export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  return allowed.some((entry) => {
    const e = entry.toLowerCase();
    if (e === '*') return false; // a bare wildcard is never honoured: list real origins
    return e.includes('*') ? patternToRegex(e).test(o) : e === o;
  });
}
