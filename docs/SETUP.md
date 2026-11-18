# Setup

## 1. Frontend (local)
```bash
npm install
cp .env.example .env.local   # then fill in the two VITE_ values
npm run dev                  # http://localhost:3000
```
Find the values in Supabase Dashboard → Project Settings → API (Project URL, Publishable key).
The publishable key is public by design; data is protected by Row Level Security.

## 2. Database (requires owner approval for the real project)
The project previously used by this repo (`ognlcllsttlyariioyjx`) is **paused**. Restore it in the Supabase dashboard (or create a new project).

Before applying, inspect what already exists (FitPick left `profiles` and `outfits`). The migration:
- keeps existing `profiles` rows and adds columns; **replaces existing policies on `profiles` with owner-only policies**;
- revokes client UPDATE on all `profiles` columns except preferences (this closes the old `is_pro` self-upgrade hole);
- does not touch `outfits`.

Apply with the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```
Then run the security advisor (Dashboard → Advisors) and confirm no RLS warnings.

## 3. Edge Functions
```bash
npx supabase secrets set GEMINI_API_KEY=<key from aistudio.google.com>   # server-side only
npx supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://<your-domain>
npx supabase functions deploy process-voice
npx supabase functions deploy delete-account
```
Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`), `VOICE_HOURLY_LIMIT` (default 30).

## 4. Auth settings (Supabase Dashboard → Authentication)
- Site URL: your app URL. Redirect URLs: add `http://localhost:3000/app` and `http://localhost:3000/reset-password` (and production equivalents).
- Email confirmation: recommended on. The default Supabase SMTP is rate-limited — configure your own SMTP before real users.

## 5. Tests
```bash
npm test                 # unit tests (validator, time zones, save mapping, priorities)
npm run typecheck
PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run test:db   # local Postgres only
```

## Security reminder
The old FitPick code shipped the Gemini key inside the browser bundle (`vite.config.ts` `define`). If that key was ever deployed or shared, **rotate it** in Google AI Studio.
