# Hygge: Requirements & Technical Plan

Hygge is a personal-care tracker built on the Islamic *sunan al-fitrah*. The user logs
the day they groomed (e.g. removed pubic hair). Hygge then counts down to the
deadline (40 days by default) and reminds them before it passes. Women also get a
detailed menstrual cycle tracker.

Platforms: **web first** (installable PWA), then **Android + iOS** with shared code.

---

## 1. Requirements (confirmed with the owner)

### Users & accounts
- Public app; anyone can sign up.
- Accounts with cloud sync (Google sign-in + email magic link).
- **Gender is chosen at onboarding and can be changed in Settings.** It sets:
  - the list of tracker items
  - the color theme (male: blue/teal/slate; female: pink/rose/lavender)
- Light / dark mode, on top of the gender theme.

### Tracker items

| Item            | Male | Female | Default interval |
|-----------------|:----:|:------:|-----------------:|
| Pubic hair      |  ✅  |   ✅   | 40 days |
| Armpit hair     |  ✅  |   ✅   | 40 days |
| Nails           |  ✅  |   ✅   | **7 days** |
| Head hair       |  ✅  |   ✅   | 40 days |
| Beard (shave or trim, user's choice) |  ✅  |  | 40 days |
| Moustache (trim) |  ✅  |        | 40 days |
| Body hair       |      |   ✅   | 40 days |
| Facial hair     |      |   ✅   | 40 days |
| Menstrual cycle |      |   ✅   | predicted (see below) |

- Each item can be enabled or disabled, and its interval can be edited.
- "Mark as done today" (or pick a past date) starts a new countdown.
- Wording is **explicit** ("Pubic hair removal due in 3 days").

### Reminders
Fully customizable per item:
- **Lead time**: remind N days before the due date (default 3)
- **On the due day**
- **Daily once overdue**, until the item is logged
- **Time of day** for reminders, in the user's own time zone

Channels (each can be toggled by the user):
1. **In-app**: countdown rings, "due soon" and "overdue" badges
2. **Browser push** (Web Push / PWA). On iOS this needs "Add to Home Screen"
3. **Email**
4. **Calendar**: a private, auto-updating `.ics` feed URL (Google/Apple/Outlook)

### Menstrual tracking (detailed)
- Log period start and end
- Daily log: flow level, symptoms, mood, notes
- Prediction of the next period from the average cycle length (last 6 cycles,
  default 28 days until enough data exists)
- Reminders: "period expected in N days"
- Stats: average cycle and period length, regularity

### History & stats
- Per-item history list and a **calendar view** (all items, color-coded)
- Streaks ("on time X times in a row"), average actual interval

### Privacy & data
- Menstrual data is sensitive health data. Rows are protected with Postgres
  Row-Level Security, so a user can only ever read their own data.
- Export my data (JSON/CSV) and **Delete my account** (hard delete).

---

## 2. Chosen stack

The app needs accounts, server-side scheduled reminders (email and push must fire
while the app is closed), and code shared with mobile later. The owner knows
TypeScript. That points to a **TypeScript monorepo + Supabase**, all on free tiers.

| Layer            | Choice | Why |
|------------------|--------|-----|
| Monorepo         | **pnpm workspaces + Turborepo** | Web and mobile share packages |
| Web app          | **Next.js (App Router) + React + TypeScript** | Mature, SSR, deploys free on Vercel |
| UI               | **Tailwind CSS + shadcn/ui**, CSS-variable themes | `data-gender` × `data-mode` theming is trivial |
| PWA / push       | Service worker + **Web Push (VAPID)** | Free, no third party |
| Mobile (later)   | **Expo (React Native) + NativeWind** | Reuses `packages/core`, types and API layer; Expo Push for notifications |
| Backend          | **Supabase**: Postgres, Auth, RLS, Edge Functions, `pg_cron` | One free service covers DB, auth and the scheduler |
| Reminder engine  | `pg_cron` runs an Edge Function hourly; it finds users whose local reminder hour is now and sends notifications | Time-zone correct, idempotent via a `notification_log` table |
| Email            | **Resend** (+ React Email templates) | Free tier, works well with TS |
| Data fetching    | supabase-js + **TanStack Query**, **Zod** validation | Same code on web and Expo |
| Dates            | **date-fns** + `@date-fns/tz`; dates stored as `DATE` + user's IANA time zone | Avoids off-by-one-day bugs |
| Testing          | **Vitest** (core logic), **Playwright** (web E2E) | |
| Hosting          | Vercel (web) + Supabase (free) + Resend (free) | $0 at small scale |

### Repository layout
```
hygge-care/
├─ apps/
│  ├─ web/            Next.js PWA
│  └─ mobile/         Expo app (phase 3)
├─ packages/
│  ├─ core/           pure TS: due-date math, reminder rules, cycle prediction, item catalog
│  ├─ api/            typed Supabase queries + TanStack Query hooks
│  └─ config/         shared tsconfig, eslint, tailwind theme tokens
├─ supabase/
│  ├─ migrations/     SQL schema + RLS policies
│  └─ functions/      send-reminders, ics-feed
└─ docs/
```

### Data model (first draft)
- `profiles`: id (= auth user), display_name, gender (`male|female`), timezone,
  reminder_hour, theme_mode, channel toggles, ics_token
- `tracker_items`: id, user_id, kind, interval_days, lead_days, remind_on_due,
  remind_overdue_daily, enabled, variant (`shave|trim`, beard only)
- `grooming_logs`: id, user_id, item_id, done_on (DATE), note
- `cycles`: id, user_id, start_date, end_date
- `cycle_day_logs`: user_id, date, flow, symptoms[], mood, note
- `push_subscriptions`: user_id, endpoint, p256dh, auth, user_agent
- `notification_log`: user_id, item_id, kind, for_date, channel (unique, used for dedupe)

Due date = last `done_on` + `interval_days`. This is computed in `packages/core`,
so web, mobile and the Edge Function all use the same logic.

---

## 3. Roadmap

1. **Phase 1 (web MVP):** monorepo scaffold, Supabase schema + RLS, auth,
   onboarding (gender, time zone), dashboard with countdowns, mark-done, edit
   intervals, history, themes + dark mode, in-app reminders.
2. **Phase 2 (reminders & cycle):** email + Web Push + `.ics` feed, cron engine,
   detailed menstrual tracking + prediction, calendar view, stats, export/delete.
3. **Phase 3 (mobile):** Expo app on the shared packages, Expo push, store releases.

## 4. Decisions log
- **Beard**: each male user chooses **Shave** or **Trim** (default: Trim). The
  choice is asked during onboarding, can be changed in the item settings, and sets
  the wording ("Beard shave due in 3 days" / "Beard trim due in 3 days").
- **Discreet mode** is included: an optional toggle, **off by default**. When on,
  push, email subjects and calendar titles use neutral wording ("Hygge: a
  reminder is due"). The full text is shown only inside the app.
- **Moustache (trim)** is a standard male item, **enabled by default**, 40 days (confirmed).
- Languages: English only for now; the code is i18n-ready so Bangla can be added later.
- Detailed build plan: see [`BUILD_PLAN.md`](./BUILD_PLAN.md).
