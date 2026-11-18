# Deploying My Voice Life

Nothing here touches Photosentry. Its Vercel project (`photosentry`) and Supabase project (`photosentry`, `zgvftpdnqszkyyyognrv`) stay exactly as they are.

## What exists today (verified)
| Thing | State |
|---|---|
| GitHub repo `hen12r/-hen12r` | holds **three** apps: FitPick on `main`, **Photosentry** on `claude/amazing-tesla-jorf1p` (in `web/`), **My Voice Life** on `claude/wonderful-gauss-4zwbs1` (PR #3) |
| Vercel `photosentry` | correctly linked to this repo; Root Directory `web`; production deploys come from `claude/amazing-tesla-jorf1p`. It also tries to build every other branch, and those builds fail harmlessly ("web does not exist") |
| Vercel project for My Voice Life | **does not exist yet** |
| Supabase `hen12r's Project` (`ognlcllsttlyariioyjx`, eu-west-1) | **paused**; holds the old FitPick schema |
| Supabase `photosentry` | active; belongs to Photosentry. **Do not use it for My Voice Life** |

## Step 0: decide where the code lives (recommended: its own repo)
**Option A (recommended): a separate GitHub repo `my-voice-life`.** One repo per product means each Vercel project builds only its own app, `main` means one thing, and nothing fails on the other app's pushes.
1. On GitHub create an **empty** repository `my-voice-life` (no README, no license).
2. Tell me its name. I'll attach it and push this branch as its `main`, with your explicit go-ahead, because that publishes code to a new repo.
3. Then do Step 1 with that repo. Photosentry and this repo stay untouched.

**Option B: keep using `hen12r/-hen12r`.** Works, with two caveats:
- Vercel's production branch defaults to `main` (FitPick). Until PR #3 is merged (with your approval), production deploys of `my-voice-life` would build FitPick. Set the production branch as described in Step 1.6.
- Each Vercel project will try to build the other app's branches. Add the "Ignored Build Step" in Step 1.7 so `my-voice-life` skips non-My-Voice-Life branches.

## Step 1: create the Vercel project (manual)
1. Go to **vercel.com/new** (team **henry7**) → **Import Git Repository** → choose the repo (A: `my-voice-life`, B: `hen12r/-hen12r`). Importing the same repo a second time is allowed and doesn't change `photosentry`.
2. **Project Name:** `my-voice-life`
3. **Framework Preset:** Vite
4. **Root Directory:** leave as `./` (repository root). **Not `web`.**
5. **Build & Output settings:** leave on default. `vercel.json` in the repo pins them: install `npm ci`, build `npm run build`, output `dist`, Node 22.x (from `package.json` `engines`).
6. **Environment Variables:** add exactly two, for **Production and Preview** (and Development if you use `vercel dev`):
   | Name | Value (from **your My Voice Life** Supabase project → Project Settings → API) |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the **Publishable** key (starts with `sb_publishable_`) |

   - **Don't copy them from the `photosentry` Vercel project.** Those point to Photosentry's database.
   - **Never** add `VITE_GEMINI_API_KEY`, a secret key (`sb_secret_…`) or a `service_role` key. The build now **refuses to run** if it finds one (`scripts/env-guard.mjs`).
7. Click **Deploy**. With option B, this first deploy builds `main` = FitPick. That's expected; ignore it. Then:
   - **Settings → Git → Production Branch:** keep `main`, and deploy My Voice Life to production only after PR #3 is merged (with your approval). Until then, use the PR's **preview** deployment.
   - **Settings → Git → Ignored Build Step** (option B only), command:
     ```
     test -f src/main.tsx -a -f vercel.json && exit 1 || exit 0
     ```
     (Vercel builds on exit 1 and skips on exit 0, so only branches containing My Voice Life are built.)
8. Optionally, to stop `photosentry` reporting failed builds on My Voice Life branches, add `test -d web && exit 1 || exit 0` as Photosentry's Ignored Build Step. This only skips branches without `web/` and doesn't change Photosentry's own deploys. **Your call.** I haven't touched Photosentry.

Note: Vercel preview deployments in your team are behind Vercel Authentication (as on `photosentry`), so testers need to be logged in to Vercel, or you disable preview protection for this project.

## Step 2: Supabase project (manual; decision needed)
**Option 1 (recommended): create a fresh project `my-voice-life`.**
- Clean schema, no FitPick leftovers, and no question about reusing FitPick users' accounts and emails for a different product.
- Free plan: two active projects allowed (`photosentry` + `my-voice-life`). The old FitPick project stays paused.
- Steps: Dashboard → New project → name `my-voice-life` → region closest to your users → generate and **save the database password in your password manager**.

**Option 2: restore `hen12r's Project` (`ognlcllsttlyariioyjx`).**
- Choose this if FitPick has real users or data you must keep.
- Dashboard → project → **Restore project**. If the dashboard says restore is no longer available (free projects can only be restored for a limited time after pausing), use option 1.
- After restoring: take the backup described in `docs/MIGRATION_REVIEW.md` **before** anything else.

**Then, either way:**
1. Run `supabase/preflight/inspect_existing_schema.sql` in **SQL Editor** (read-only) and send me the output. On a fresh project it will show an empty schema.
2. **Authentication → URL Configuration:**
   - Site URL: `https://my-voice-life.vercel.app` (or your domain)
   - Redirect URLs: `https://my-voice-life.vercel.app/**`, `https://my-voice-life-*-henry7.vercel.app/**` (previews), `http://localhost:3000/**`
3. **Authentication → Providers → Email:** keep "Confirm email" on. Before real users arrive, configure your own SMTP; the built-in sender is heavily rate-limited.
4. Tell me which project you chose. I'll confirm its status and URL, and **wait for your explicit approval** before applying the migration (`docs/MIGRATION_REVIEW.md`).

## Step 3: Gemini key as a server-side secret (manual)
1. Create a key in **Google AI Studio** (aistudio.google.com → Get API key). In Google Cloud Console → Credentials, restrict it to the **Generative Language API**.
2. Check the data-use terms: as far as I know, the **unpaid** Gemini tier allows Google to use submitted content to improve its products, and the paid tier doesn't. Users' voice notes are personal data, so use a billed key before real users. Enabling billing costs money, so it's your decision.
3. Store it **only** as a Supabase Function Secret. The simplest way, with no key in your terminal history: **Dashboard → Edge Functions → Secrets → Add new secret**:
   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key |
   | `ALLOWED_ORIGINS` | `http://localhost:3000,https://my-voice-life.vercel.app,https://my-voice-life-*-henry7.vercel.app` |
   | `GEMINI_MODEL` (optional) | default `gemini-2.5-flash`. Check it's still offered in AI Studio |
   | `VOICE_HOURLY_LIMIT` (optional) | default `30` |

   Never paste the key into chat, GitHub, `.env.local`, Vercel, or any `VITE_` variable. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically; don't set them.
4. Deploy the functions, either yourself:
   ```bash
   npx supabase functions deploy process-voice --project-ref <project-ref>
   ```
   ```bash
   npx supabase functions deploy delete-account --project-ref <project-ref>
   ```
   or tell me "deploy the functions" and I'll do it with the Supabase tools.

## Step 4: final verification (together)
When Steps 1–3 are done, I run and report each item with its evidence:
| # | Check | How |
|---|---|---|
| 1 | Supabase connection and status | Supabase tools: project `ACTIVE_HEALTHY`, tables present, **security advisor clean** |
| 2 | Environment variables | `npm run check:env -- --origin https://my-voice-life.vercel.app` (masked output; verifies format, auth health, anonymous access blocked, function deployed, CORS, unauthenticated calls rejected) |
| 3 | Gemini backend | function logs, plus a real capture in the app; an `ai_not_configured` error means the secret is missing |
| 4 | Build | `npm run build` |
| 5 | Tests | `npm test`, `npm run typecheck`, `npm run test:db`, `deno check` |
| 6 | Branch | `git status` / PR head SHA equals the deployed SHA |
| 7 | Fresh deployment | only with your approval: a push to the PR branch (preview) or a redeploy |
| 8 | Deployment logs | Vercel build logs for that deployment |
| 9 | Live app | the manual test plan in `docs/ROADMAP.md`: sign-up, voice capture, review, save, isolation between two accounts, delete account |

Nothing gets reported as working without the output that shows it.
