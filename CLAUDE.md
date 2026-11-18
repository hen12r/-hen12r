# CLAUDE.md — My Voice Life

AI personal assistant: speak once → reviewed tasks, reminders, events and notes → searchable personal memory.
Tagline: *Your voice. Your ideas. Your organised life.*

## Stack
- **Frontend:** Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS v4 (`@tailwindcss/vite`) + React Router 7 + lucide-react. Source in `src/`.
- **Backend:** Supabase (Postgres + Auth + RLS) and Deno Edge Functions in `supabase/functions/`.
- **AI:** Gemini via REST, called **only** from the `process-voice` Edge Function (key = Supabase secret `GEMINI_API_KEY`).

## Commands
- `npm run dev` — dev server on :3000 (needs `.env.local`, see `.env.example`)
- `npm run typecheck` / `npm test` (Vitest) / `npm run build`
- `npm run test:db` — applies all migrations to a throwaway local Postgres with a Supabase shim and runs `supabase/tests/rls_test.sql`. Needs `PGHOST/PGPORT/PGUSER` pointing at a **local** Postgres. Never point it at production.
- `npx deno@2.1.4 check supabase/functions/*/index.ts` — type-check Edge Functions.

## Non-negotiable rules
1. **No secrets in the browser.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be `VITE_*`. AI keys and the service-role key live only in Edge Function secrets. Never commit `.env*` (except `.env.example`).
2. **RLS on every user-owned table**, owner-only policies using `(select auth.uid()) = user_id`. Never disable RLS to fix a bug. Add a case to `supabase/tests/rls_test.sql` for every new table.
3. **Entitlements are server-side.** `subscriptions` and `usage_counters` are writable by the service role only; quotas are enforced by DB triggers (`enforce_note_quota`). The client never decides plan limits.
4. **Nothing AI-generated is saved without user confirmation.** `process-voice` returns proposals; the client commits only accepted items. All model output passes `validateExtraction()` (`supabase/functions/_shared/extraction.ts`).
5. **Never invent dates.** Ambiguous dates are cleared and flagged; reminders/events cannot be saved without a date.
6. **Audio is never stored.** It is processed in memory by the Edge Function. Transcripts are stored (they are the memory).
7. **No fake features.** No decorative buttons, no fake AI output, no claims of support that are untested (Kinyarwanda is "experimental" until tested with real speakers).
8. Migrations are additive/idempotent SQL files in `supabase/migrations/`. Applying to the real project requires the owner's explicit approval.
9. Do not merge to `main` or deploy without the owner's approval.

## Layout
```
src/
  auth/AuthProvider.tsx   session + profile context
  components/             AppShell (nav), ui.tsx (design-system primitives)
  lib/                    supabase client, api (data access + commit logic), dates (tz math), i18n (en/fr), types
  pages/                  Landing, Auth (login/register/forgot/reset), Dashboard, Capture, Notes, Tasks, Schedule, Memory, Settings
  voice/useRecorder.ts    MediaRecorder hook (in-memory only)
supabase/
  migrations/             versioned SQL
  functions/_shared/      extraction.ts (pure, shared with client & tests), http.ts (Deno CORS/json)
  functions/process-voice transcription + extraction (Gemini)
  functions/delete-account
  tests/                  shim + RLS test suite
docs/                     ARCHITECTURE, PRODUCT (competitive analysis), ROADMAP (status), SETUP
```

## Conventions
- Shared logic that both Deno and the browser need goes in `supabase/functions/_shared/*.ts` with **no** Deno/browser APIs.
- UI strings go through `useI18n().t()`; add keys to both `en` and `fr` in `src/lib/i18n.tsx`. Kinyarwanda UI strings require native-speaker review — do not machine-generate them.
- Store instants as `timestamptz` (UTC) and the user's IANA zone alongside; convert with `src/lib/dates.ts`.
- Keep `docs/ROADMAP.md` honest: "done" means implemented **and** tested.
