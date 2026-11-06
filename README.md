# Hygge

A gentle personal-care tracker. Log the day you groomed, and Hygge reminds you before
the next deadline (40 days by default). It has an **Islamic mode** (sunan al-fitrah,
Hijri dates, Dhul Hijjah/Qurbani and ihram awareness) and a **Default mode**. Women
also get a detailed menstrual cycle tracker.

- Plan and requirements: [`docs/PLAN.md`](docs/PLAN.md)
- Milestones: [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md)

## Project layout

| Path              | What                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | Next.js web app (PWA)                                                                                                                   |
| `packages/core`   | Shared TypeScript logic: item catalog, due dates, the daily reminder digest, Hijri dates, cycle prediction, and all user-facing wording |
| `packages/config` | Shared TypeScript config                                                                                                                |

## Getting started

Requires Node 22 and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev        # web app on http://localhost:3000
pnpm test       # unit tests
pnpm typecheck
pnpm build
```

## Keys: not needed to start

Hygge runs **without any keys**. With the two Supabase variables blank it uses _local mode_:
everything is saved in your browser, and there is no sync. Add keys later and it switches to
cloud mode with no code changes.

```bash
cp apps/web/.env.example apps/web/.env.local   # leave both values blank for local mode
```

### Turning on cloud sync (Supabase)

1. Create a free project at supabase.com.
2. Auth settings: turn on **Anonymous sign-ins** (this powers "try without an account").
3. Run the SQL in `supabase/migrations/0001_init.sql` (SQL editor, or `supabase db push`).
4. Put the **Project URL** and the **anon (public) key** in `apps/web/.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Never commit these files, and never use the service-role key in the web app.
5. Google sign-in (later): add the Google client ID and secret in Supabase, under
   Auth, then Providers.
