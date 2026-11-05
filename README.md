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
