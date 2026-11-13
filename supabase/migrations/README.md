# Database changes (applied to project `photosentry` via the Supabase MCP tools)

In order: `create_scan_requests`, `create_accounts_products_scans`, `create_subscriptions_and_plan_limits`,
`lock_product_limit`, `product_image_and_scan_frequency`, `recurring_scans_queue_and_cron_secret`.
The applied SQL is visible in Supabase → Database → Migrations.

Scheduled jobs (pg_cron):
- `photosentry-enqueue-due-scans` — daily 05:17 UTC: `enqueue_due_scans()` queues a scan for each product with a photo link
  that was never scanned or whose last completed scan is older than its plan interval (30 days Trial/Starter, 7 days Pro).
- `photosentry-run-scan-worker` — hourly at :23: `trigger_scan_worker()` POSTs to `/functions/v1/scan/cron` with the
  `scan_cron_secret` stored in Vault; the function checks it through `check_cron_secret()` (service role only).

Pending cleanup (needs the owner to confirm the drop in Supabase): move `pg_net` out of the public schema
(`drop extension pg_net; create extension pg_net with schema extensions;`).

Pending (needs the owner to confirm in Supabase): `close_public_scan_request_form`, the public free-scan form was removed from the site:
`drop policy if exists "anon can submit a scan request" on public.scan_requests; revoke insert on public.scan_requests from anon;`
