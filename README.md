# PhotoSentry

A SaaS for Amazon sellers: it finds competitors who reuse a seller's product photos without permission, on Amazon and across the web (Temu, AliExpress, eBay, Shopify stores…), and prepares the evidence needed to get them taken down.

## What's here

| Folder | What it is |
| --- | --- |
| `web/` | Bilingual (FR/EN) landing page with a free-scan request form. Requests go to Supabase. |
| `poc/` | Proof-of-concept scanner: reverse image search via Google Cloud Vision, per-platform report. |

## Status

Validation phase. The landing page collects free-scan requests from real sellers; scans are run by hand with `poc/` and reports are emailed. The SaaS app (accounts, dashboard, automatic monitoring) comes only if sellers sign up and the scans find real copies.

See `web/README.md` and `poc/README.md` for setup.
