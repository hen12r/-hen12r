# FitPick

Complete outfits for students and young adults on a 30–100 € budget. Answer a short survey (gender, occasion, style, weather, budget) to get matching looks. Signed-in users also get an AI "vibe scan" of a photo, AI style ideas, and a virtual try-on (Gemini). Supabase handles auth, profiles and the optional extra outfit catalog.

## Run locally

Prerequisites: Node.js 20+

```bash
npm install
```

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your-key-here
```

```bash
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run typecheck` | `tsc --noEmit` under `strict` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |

## Layout

```
App.tsx              step state, survey answers, step → screen switch
screens/             one component per screen (Welcome, Auth, Results, ...)
hooks/               useAuth (session + profile), useOutfits (catalog + filter), useImageUpload
services/            geminiService (AI calls), supabaseService (auth, profiles, outfits)
i18n/translations.ts en / fr / es / de strings; missing keys are compile errors
constants.tsx        static outfit catalog, FREE_SCAN_LIMIT, icons
types.ts             domain types and AppStep
```

## Known issues

These are **not production-safe yet** and need a backend (planned: Vercel serverless functions):

1. **The Gemini API key ships to the browser.** `vite.config.ts` inlines `GEMINI_API_KEY` into the client bundle, so anyone can extract it and run up usage. All `geminiService` calls need to move behind a server endpoint.
2. **The Pro upgrade is fake.** `screens/Paywall.tsx` waits 2 seconds and then sets `is_pro = true` from the client. No payment happens, and the "Secure payments via Stripe" footer is untrue. It needs Stripe Checkout and a webhook that sets `is_pro` server-side, plus Supabase RLS that stops users from updating `is_pro` / `photos_used` themselves.
3. **The free-scan limit is enforced only in the client** (`FREE_SCAN_LIMIT`). It has to be checked by the same server endpoint that calls Gemini.

Product gaps:

- The static catalog has 16 outfits across 90 survey combinations, so most survey paths end on an empty Results page with no empty-state message.
- There is no language switcher; French, Spanish and German translations exist but can't be selected.
- `animate-in` / `fade-in` / `slide-in-*` classes are no-ops (they need `tw-animate-css`), the same as under the old Tailwind CDN.
- `getStyleIdeation` parses shoppable items and sources, but the UI doesn't show them.
