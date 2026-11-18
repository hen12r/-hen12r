import { describe, expect, it } from 'vitest';
import { isOriginAllowed, parseAllowedOrigins } from './cors.ts';

const allowed = parseAllowedOrigins('http://localhost:3000, https://my-voice-life.vercel.app, https://my-voice-life-*-henry7.vercel.app');

describe('CORS origin matching', () => {
  it('allows exact origins', () => {
    expect(isOriginAllowed('https://my-voice-life.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
  });
  it('allows Vercel preview URLs that match the pattern', () => {
    expect(isOriginAllowed('https://my-voice-life-git-claude-wonderful-gauss-4zwbs1-henry7.vercel.app', allowed)).toBe(true);
    expect(isOriginAllowed('https://my-voice-life-4w2zip2ie-henry7.vercel.app', allowed)).toBe(true);
  });
  it('rejects look-alikes and other projects', () => {
    expect(isOriginAllowed('https://my-voice-life-x-henry7.vercel.app.evil.com', allowed)).toBe(false);
    expect(isOriginAllowed('https://evil.com/https://my-voice-life.vercel.app', allowed)).toBe(false);
    expect(isOriginAllowed('https://photosentry.vercel.app', allowed)).toBe(false);
    expect(isOriginAllowed('https://my-voice-life-a.b-henry7.vercel.app', allowed)).toBe(false); // * never spans a dot
    expect(isOriginAllowed(null, allowed)).toBe(false);
  });
  it('never honours a bare *', () => {
    expect(isOriginAllowed('https://anything.com', ['*'])).toBe(false);
  });
  it('defaults to localhost only', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['http://localhost:3000']);
  });
});
