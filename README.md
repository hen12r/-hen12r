# PhotoSentry

A SaaS for Amazon sellers: it finds competitors who reuse a seller's product photos without permission, on Amazon and across the web (Temu, AliExpress, eBay, Shopify stores…), and prepares the evidence needed to get them taken down.

## What's here

| Folder | What it is |
| --- | --- |
| `web/` | FR/EN site (Vite + React): landing, pricing, magic-link accounts, dashboard, scan reports with takedown requests and CSV evidence, account deletion, privacy and legal pages. Deployed on Vercel. |
| `supabase/functions/` | Edge Functions: `scan` (Google Cloud Vision reverse image search, on demand and by cron), `billing` (Stripe Checkout, portal, webhook), `account` (self-service deletion). |
| `supabase/migrations/` | List of the database changes and cron jobs applied to the project. |
| `poc/` | Original command-line scanner; `scan` reuses its matching code. |

## Status

Built end to end; waiting on the keys. To go live: set `GOOGLE_VISION_API_KEY`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase → Edge Functions → Secrets, configure the Stripe webhook and customer portal, and fill in the publisher details in `web/src/brand.ts` (`LEGAL`).

See `web/README.md` and `poc/README.md` for setup.
