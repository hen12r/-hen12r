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

## Payments (Stripe)

Plans: **Trial** (free, 1 product), **Starter** €19/month (10 products), **Pro** €49/month (50 products). Limits are enforced in the database (trigger on `products`), not just in the UI.

- `supabase/functions/billing` (deployed, `verify_jwt` off because it authenticates itself):
  - `POST /billing/checkout`: logged-in user → Stripe Checkout Session (prices defined inline, nothing to create in Stripe). Refuses if the user already pays (`409`): plan changes go through the portal.
  - `POST /billing/portal`: Stripe customer portal (change plan, cancel, invoices).
  - `POST /billing/webhook`: verifies the `Stripe-Signature` header (HMAC, 5-minute replay window), re-reads the subscription from Stripe and upserts `public.subscriptions` with the service role.
- `public.subscriptions`: sellers can only read their own row; only the webhook writes.
- Function secrets (Supabase → Edge Functions → Secrets): `STRIPE_SECRET_KEY` (`sk_test_…` in test mode), `STRIPE_WEBHOOK_SECRET` (`whsec_…`), optional `SITE_URL`.
- Stripe dashboard → Developers → Webhooks: endpoint `https://zgvftpdnqszkyyyognrv.supabase.co/functions/v1/billing/webhook`, events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Stripe dashboard → Settings → Billing → Customer portal: enable it (plan switching between Starter and Pro, cancellation).
- The pricing page shows a "test mode" notice until `VITE_STRIPE_TEST_MODE=false` is set in Vercel. **Only go live with a registered business (SIRET) and live keys.**
- Tests: `node --test supabase/functions/billing/stripe.test.mjs`.

## Automatic scans

- Sellers can give each product a **main photo link** (`products.image_url`, https only). Google Vision fetches it directly; our servers never download from Amazon.
- `supabase/functions/scan` (`POST /scan/run`, deployed): for the logged-in seller, claims each `requested` scan that has a photo link (atomic `requested → scanning`), runs Vision web detection, stores findings and marks it `done` (or `failed` with the error). Called by the site right after "Request a scan". Detection code is a verbatim copy of `poc/` (a test fails if they drift).
- Needs the function secret `GOOGLE_VISION_API_KEY` (Supabase → Edge Functions → Secrets). Without it, scans stay `requested` and are run by hand as below.
- Plan frequency is enforced in the database: one completed scan per product every 30 days (Trial, Starter) or 7 days (Pro). A request inside that window fails with `scan_too_soon` and the date it opens again.
- Tests: `node --test supabase/functions/scan/scan.test.mjs`.

## Running a scan for a seller (manual fallback)

1. Supabase → Table editor → `scans`, filter `status = requested`. Note the scan `id` and the product's ASIN.
2. Copy the listing's main image URL, then run the scanner: `node poc/scan.mjs <image URL> --own-asin <ASIN> --out poc/out`.
3. `node poc/to-sql.mjs poc/out/report.json --scan <scan id>` prints SQL; run it in the Supabase SQL editor. The seller sees the report in their account.

## Known limits (v0)

- No rate limiting, only a honeypot field. If spam shows up, move the insert behind a server function with a captcha.
- `CONTACT_EMAIL` in `src/brand.ts` is the founder's personal address for now; switch it to a dedicated product inbox.
- The example report uses fictional brands and `.example` URLs on purpose.
