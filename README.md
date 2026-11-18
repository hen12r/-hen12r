# My Voice Life

**Your voice. Your ideas. Your organised life.**

Speak once. My Voice Life turns what you said into separate tasks, reminders, events and notes. You review every item before it's saved, then find any of it again in your personal memory.

- Voice or typed capture → AI proposals → you confirm → saved
- Never invents dates. Ambiguous ones must be chosen by you
- Private by design: Row Level Security on every table, audio never stored
- English and French interface; Kinyarwanda speech is experimental

**Status:** early development. See [docs/ROADMAP.md](docs/ROADMAP.md) for what is done and verified.

## Quick start
```bash
npm install
cp .env.example .env.local   # add your Supabase URL + publishable key
npm run dev
```
Local setup: [docs/SETUP.md](docs/SETUP.md) · Deploying: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · Migration review: [docs/MIGRATION_REVIEW.md](docs/MIGRATION_REVIEW.md) · Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Strategy: [docs/PRODUCT.md](docs/PRODUCT.md) · Kinyarwanda testing: [docs/kinyarwanda/TEST_PLAN.md](docs/kinyarwanda/TEST_PLAN.md)

## Tests
`npm test` · `npm run typecheck` · `npm run test:db` (local Postgres only)
