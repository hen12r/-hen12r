# Architecture

## Overview
```
Browser (React SPA, PWA-ready)
  │  supabase-js (publishable key + user JWT)        ── RLS-protected CRUD on notes/tasks/reminders/events/categories/profiles
  │  fetch /functions/v1/process-voice (JWT)          ── audio or text → proposals (nothing saved except a voice_session row)
  ▼
Supabase
  ├─ Auth (email + password, password recovery)
  ├─ Postgres  ── RLS on every user table · quota trigger · new-user bootstrap trigger · search_memory() RPC
  └─ Edge Functions (Deno)
       ├─ process-voice  → Gemini (transcribe) → Gemini (structured extraction) → validateExtraction() → proposals
       └─ delete-account → auth.admin.deleteUser (service role, server-only) → cascades all data
```

## The voice-to-action pipeline
1. `useRecorder` captures Opus/WebM (or MP4 on Safari) in memory, max 5 min, with level meter, cancel and permission-error handling.
2. `process-voice` authenticates the caller, rate-limits (30/hour), and checks size and type.
3. **Transcription**: Gemini audio input, prompt = verbatim, no translation; returns `{transcript, language}`.
4. **Extraction**: a second Gemini call with `responseSchema` and today's date and weekday *in the user's time zone*. The prompt forbids invention and requires `date_confidence`.
5. **Validation** (`_shared/extraction.ts`, unit-tested): drops unknown types, bounds lengths, rejects impossible dates, **clears non-explicit dates**, flags reminders/events with no date, maps categories to ones the user owns.
6. The client shows editable cards. The user accepts, edits or rejects each one. Reminders and events cannot be saved without a date.
7. `commitItems` inserts each accepted item separately (one failure, such as the quota, doesn't lose the others) and converts local date/time to UTC with the user's IANA zone.

Two calls instead of one: the user can edit the transcript and re-run only the extraction (also used for typed input), and transcription can later move to a different provider without touching extraction.

## Data model (see migration for full DDL)
| Table | Purpose | Notes |
|---|---|---|
| profiles | preferences: name, ui_language, speech_language, timezone | client may update preference columns only |
| categories | 7 defaults per user plus custom | unique per user (case-insensitive) |
| voice_sessions | one per capture: transcript, language, duration, provider, status | **no audio** |
| notes | notes, ideas, personal info | `kind`, FTS `search` column |
| tasks | title, details, status, priority, due_date (local day), due_at (UTC, only if a time was stated) | completed_at kept by trigger |
| reminders | remind_at (UTC) + timezone + recurrence | partial index ready for a delivery worker |
| events | starts_at/ends_at, all_day, location | |
| subscriptions | plan/status/Stripe ids | service-role write only |
| usage_counters | monthly monotonic counters | deleting a note does not refund quota |

Cross-user references are impossible: child tables use composite FKs `(category_id, user_id) → categories(id, user_id)`.

## Memory search
`search_memory(q)` is `SECURITY INVOKER`, so RLS applies. It uses Postgres full-text search with the `simple` configuration (no stemming, so it's language-neutral for en/fr/rw) plus an ILIKE fallback for partial words. Results are always real records with links. **Semantic search (pgvector embeddings) and AI summaries over results are not built yet**; see the roadmap.

## Speech provider decision
| Provider | en | fr | rw (Kinyarwanda) | Notes |
|---|---|---|---|---|
| Gemini (audio input) | strong | strong | **unverified** | already in the project; one key covers transcription + extraction |
| Google Cloud Speech-to-Text V2 | yes | yes | **listed (`rw-RW`)** | per Google's language table: no automatic punctuation or word confidence for rw |
| OpenAI Whisper / gpt-4o-transcribe | strong | strong | not in Whisper's documented language list (verify) | |
| ElevenLabs Scribe | strong | strong | check their current list | |

Evaluation method and tooling: [kinyarwanda/TEST_PLAN.md](kinyarwanda/TEST_PLAN.md). Decision: start with **Gemini** for en/fr (lowest integration cost, existing key). Treat Kinyarwanda as **experimental** until it has been tested on real recordings from native speakers (target: WER against hand transcripts on 30+ clips). If Gemini is poor on rw, route `language_hint = rw` to Google Cloud STT `rw-RW` behind the same `transcribe()` interface. Nothing in the UI claims rw works beyond "experimental".

## Known limitations (by design for this milestone)
- Reminder **delivery** (push/email) is not implemented; reminders are stored and shown in the app. Planned: `pg_cron` → Edge Function → Web Push (VAPID), using `reminders_due_idx`.
- Server warnings from the validator are English-only.
- The bundle is about 600 kB (171 kB gzip); route-level code splitting is a later optimisation.
