# Local development setup

For deploying (Vercel, Supabase, secrets), see **[DEPLOYMENT.md](DEPLOYMENT.md)**. For the database migration and its approval, see **[MIGRATION_REVIEW.md](MIGRATION_REVIEW.md)**.

## Run the app locally
```bash
npm install
```
```bash
cp .env.example .env.local
```
Fill in the two values in `.env.local` from **your My Voice Life** Supabase project (Project Settings → API): `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key is public by design; Row Level Security protects the data. Then:
```bash
npm run check:env
```
```bash
npm run dev
```
Without `.env.local`, the app shows a "Connect Supabase" screen instead of crashing.

## Tests
| Command | What it covers |
|---|---|
| `npm test` | unit tests: extraction validator, time zones, save mapping, priorities, env guard, CORS matching, speech metrics |
| `npm run typecheck` | strict TypeScript |
| `npm run build` | production build (refuses to build if a `VITE_*` variable looks like a secret) |
| `npm run test:db` | applies the migration to a **throwaway local** Postgres in three scenarios (fresh, simulated FitPick, conflicting table) and runs 51 checks. Needs `PGHOST/PGPORT/PGUSER` for a local server. Never point it at a real project |
| `npx deno@2.1.4 check supabase/functions/process-voice/index.ts supabase/functions/delete-account/index.ts` | Edge Function types |

## Security reminders
- The old FitPick build injected the Gemini key into the browser bundle. If FitPick was ever deployed or the key shared, **rotate that key** in Google AI Studio.
- Server secrets (`GEMINI_API_KEY`, `ALLOWED_ORIGINS`) live only in Supabase Function Secrets.
- Evaluation recordings (`eval-data/`) and database backups (`backup/`, `*.dump`) are git-ignored because they contain personal data.
