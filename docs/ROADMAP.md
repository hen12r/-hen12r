# Roadmap & status

Legend: ✅ implemented **and** tested · 🟡 implemented, not yet verified against real services · ⬜ not started

## Milestone 1 — Foundation, security model, core voice-to-action (this branch)
| Item | Status | Evidence |
|---|---|---|
| Replace FitPick with My Voice Life app shell (Vite/React/TS/Tailwind v4, router) | ✅ | typecheck + build pass; rendering smoke test at 375px and 1366px, no overflow, no console errors (backend mocked) |
| Remove Gemini key from browser bundle | ✅ | bundle grep: no key/endpoint strings |
| DB schema: profiles, categories, voice_sessions, notes, tasks, reminders, events, subscriptions, usage_counters | ✅ | migration applied twice (idempotent) to local Postgres 16 |
| RLS owner-only on every user table; client cannot self-upgrade plan | ✅ | 34 assertions in `supabase/tests/rls_test.sql` |
| Free-plan note quota enforced server-side, not refundable by deleting | ✅ | DB tests |
| New-user bootstrap (profile, 7 default categories, free plan) | ✅ | DB tests |
| Keyword memory search (RLS-safe RPC) | ✅ | DB tests (incl. no cross-user leakage) |
| Extraction validator (no invented dates, bounded output) | ✅ | 11 unit tests |
| Time-zone conversion and recurrence math | ✅ | 8 unit tests (Kigali, Paris DST, Toronto) |
| Proposal → record mapping, priority ranking | ✅ | 8 unit tests |
| `process-voice` Edge Function (auth, rate limit, Gemini transcribe + extract) | 🟡 | `deno check` passes; **not run against real Gemini/Supabase yet** |
| `delete-account` Edge Function | 🟡 | `deno check` passes; not run against real Supabase |
| Auth: register, login, logout, password reset, persistent session | 🟡 | UI built; needs a live Supabase project to verify |
| Pages: Landing, Dashboard, Capture/Review, Notes, Tasks, Schedule, Memory, Settings | 🟡 | render-tested with mocked data; CRUD needs a live project |
| Recorder: duration, cancel, max length, permission-denied handling | 🟡 | denied-permission path tested in Chromium; real recording needs a device mic |
| en/fr interface | ✅ | all keys typed and present in both |

### Blocked on owner action
1. Restore (or recreate) the Supabase project and approve applying the migration.
2. Set `GEMINI_API_KEY` as a Supabase secret, and **rotate the old key** if FitPick was ever deployed.
3. Record 30+ real Kinyarwanda clips (native speakers) to measure transcription quality.

## Milestone 2 — Verify end-to-end on the real project
⬜ Apply migration, deploy functions, run the manual test plan below, fix what breaks · ⬜ Kinyarwanda WER evaluation and provider decision · ⬜ Translate validator warnings

## Milestone 3 — Reminders that actually fire
⬜ `pg_cron` job → Edge Function → Web Push (VAPID) with notification permission flow · ⬜ Service worker (installable PWA, offline shell) · ⬜ Server-side recurrence advance after delivery

## Milestone 4 — Memory intelligence
⬜ pgvector embeddings on notes and transcripts · ⬜ "Ask your memory": answer **only** from retrieved records, each claim linked to its source, AI suggestions visually separated · ⬜ Transcript translation (keep original)

## Milestone 5 — Daily briefing & weekly report
⬜ Daily briefing (opt-in, `daily_briefing_enabled` already in schema) · ⬜ Weekly report from real completed/unfinished/upcoming data

## Milestone 6 — Business
⬜ Decide payment provider (Stripe availability for your country vs mobile money) · ⬜ Checkout + webhook writing `subscriptions` with the service role · ⬜ Billing page · ⬜ Revisit free-tier metric (see docs/PRODUCT.md)

## Milestone 7 — Production readiness
⬜ Vercel deployment config + env · ⬜ Custom SMTP · ⬜ Error monitoring · ⬜ Code splitting · ⬜ Playwright e2e against a Supabase branch · ⬜ Privacy policy and data export

## Manual test plan (once the project is live)
1. Register → confirm email → land on dashboard; check that Settings shows your device time zone and 7 categories.
2. Speak: "Tomorrow I need to call my school, prepare my CV, buy a notebook and practise piano." Expect 4 tasks dated tomorrow, each editable. Save and check them in Tasks and the dashboard.
3. Speak: "Remind me to call mum this weekend." Expect a reminder flagged "choose a date" and Save disabled until you pick one.
4. Deny microphone permission → a clear message is shown and typing still works.
5. Create 7 notes → the 8th is refused with the plan-limit message. Delete one → still refused.
6. Second account in a private window: none of the first account's data is visible, including in Memory search.
7. Settings → delete account → you're signed out, and logging in again fails.
