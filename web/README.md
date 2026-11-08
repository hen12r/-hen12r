# PhotoSentry web app

Vite + React 19 + TypeScript (strict) + Tailwind v4 + React Router. French and English (toggle in every header, remembered per browser; defaults to the browser language).

| Route | Page |
| --- | --- |
| `/` | Landing page with the free-scan form (no account needed) |
| `/login` | Log in with an emailed link (no password), or Google once enabled |
| `/app` | My products: add/remove ASINs, see scan status, request a scan |
| `/app/scans/:id` | Scan report: copies found, by platform |

Account pages are code-split, so landing-page visitors never download supabase-js or the app. `vercel.json` rewrites every path to `index.html` so deep links work.

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

## Accounts (Supabase Auth)

Tables `products`, `scans`, `scan_findings`, all with row-level security:
- A seller reads only their own rows (`user_id = auth.uid()`).
- Sellers may add/rename/delete their products and request a scan for a product they own (one open scan per product).
- Scan status, results and errors are written **only by the admin** (SQL editor / service role), so a seller can't fake a report.

**One-time setup in the Supabase dashboard (required for login to work in production):**
1. Authentication → URL Configuration: **Site URL** = `https://photosentry.vercel.app`, and add `https://photosentry.vercel.app/**` and `http://localhost:5173/**` to **Redirect URLs**. Otherwise login links point to the default `localhost:3000`.
2. Authentication → Emails → SMTP: the built-in sender only allows a few emails per hour. Connect an email provider (e.g. Resend) before real users arrive.
3. Google (optional): create an OAuth client in Google Cloud (authorized redirect URI: `https://zgvftpdnqszkyyyognrv.supabase.co/auth/v1/callback`), paste its client ID and secret in Authentication → Providers → Google, then set `VITE_GOOGLE_AUTH=true` in Vercel and redeploy. The Google button stays hidden until then.

## Running a scan for a seller

1. Supabase → Table editor → `scans`, filter `status = requested`. Note the scan `id` and the product's ASIN.
2. Copy the listing's main image URL, then run the scanner: `node poc/scan.mjs <image URL> --own-asin <ASIN> --out poc/out`.
3. `node poc/to-sql.mjs poc/out/report.json --scan <scan id>` prints SQL; run it in the Supabase SQL editor. The seller sees the report in their account.

## Known limits (v0)

- No rate limiting, only a honeypot field. If spam shows up, move the insert behind a server function with a captcha.
- `CONTACT_EMAIL` in `src/brand.ts` is the founder's personal address for now; switch it to a dedicated product inbox.
- The example report uses fictional brands and `.example` URLs on purpose.
