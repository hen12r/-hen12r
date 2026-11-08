# PhotoSentry landing page

Vite + React 19 + TypeScript (strict) + Tailwind v4. One page, French and English (toggle in the header, remembered per browser; defaults to the browser language).

## Run locally

```bash
cp .env.example .env.local   # then fill in the publishable key
npm install
npm run dev                  # http://localhost:5173
npm run typecheck
npm run build
```

## Free-scan requests (Supabase)

- Project `photosentry` (EU, Paris), table `public.scan_requests`.
- Row-level security: visitors (`anon`) may **insert only**, and only the columns `email, asin, marketplace, locale, consent`. They can't read, change or delete any request, or set `status`.
- CHECK constraints enforce a valid email, a 10-character ASIN, a known marketplace, `fr`/`en`, and `consent = true`, so calling the API directly can't bypass the form's validation.
- Read requests in the Supabase dashboard (Table editor → `scan_requests`) and move `status` through `new → scanned → sent`.
- The publishable key in `.env.local` is meant to be public; it only has the access above.

## Known limits (v0)

- No rate limiting, only a honeypot field. If spam shows up, move the insert behind a server function with a captcha.
- `CONTACT_EMAIL` in `src/brand.ts` is a placeholder; replace it with a real inbox before sharing the site.
- The example report uses fictional brands and `.example` URLs on purpose.
