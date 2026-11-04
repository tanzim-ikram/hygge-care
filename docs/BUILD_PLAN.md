# Hygge: Build Plan

This plan breaks [`PLAN.md`](./PLAN.md) into milestones that can be built in order.
Each milestone ends in a working, tested state and is committed separately.

---

## 0. Before we start (owner to-do)

These need your accounts. I can build and test most of Milestones 1–3 without them,
but the app can't run against a real backend until they exist.

| # | What | Needed for | Notes |
|---|------|-----------|-------|
| 1 | **Supabase** project (free) | M3 onward | Share the Project URL + anon key. The service-role key goes only into Supabase/Vercel secrets, never into git |
| 2 | **Google OAuth** client (Google Cloud Console) | M4 | Pasted into Supabase → Auth → Providers |
| 3 | **Vercel** account linked to this GitHub repo | M11 | Free Hobby plan |
| 4 | **Resend** account + API key | M8 | A verified domain is needed to email anyone besides yourself |
| 5 | (Optional) domain name, e.g. `hygge.app` | M8/M11 | Email sender + nicer URL |

I generate the VAPID keys (for Web Push) myself.

---

## 1. Core rules (the shared logic)

These rules live in `packages/core` and are used by the web app, the reminder job and,
later, the mobile app.

**Due date** = latest `done_on` + `interval_days`. An item that has never been logged
shows "Not started" with a "Log first time" button.

**Status of an item on date D** (in the user's time zone):
| Status | Condition |
|---|---|
| `ok` | D < due − lead_days |
| `due_soon` | due − lead_days ≤ D < due |
| `due_today` | D = due |
| `overdue` | D > due |

**Which reminder fires on date D** (at the user's reminder hour):
- D = due − lead_days → "Pubic hair removal due in 3 days"
- D = due and `remind_on_due` → "Pubic hair removal is due today"
- D > due and `remind_overdue_daily` → "Pubic hair removal is overdue by 2 days"
- With discreet mode on → "Hygge: a reminder is due"
- Every send is recorded in `notification_log` with the unique key
  `(user, item, for_date, channel)`. If the job runs twice, nobody gets a duplicate.

**Cycle prediction**
- Cycle length = days between consecutive period starts. Average the last 6 cycles,
  ignoring anything outside 15–60 days as a logging error. Default to 28 until there
  are at least 2 logged cycles.
- Period length = the average of logged lengths, default 5.
- Next period = last start + average cycle; fertile window and ovulation estimate
  shown as "estimate only".
- Regularity = standard deviation of cycle length (≤ 3 days counts as "regular").
- Reminder: "Your period is expected in N days" (lead time is editable, default 2).

**Changing gender in Settings**: the items for the new gender are switched on (and
created if missing). Items that only belong to the old gender are switched off, not
deleted, so their history is kept and reappears if you switch back. The theme changes
right away.

---

## 2. Milestones

### M1 · Foundation
- pnpm workspaces + Turborepo; strict TypeScript; ESLint + Prettier
- `apps/web` (Next.js App Router, Tailwind, shadcn/ui), `packages/core`,
  `packages/api`, `packages/config`
- Vitest set up; GitHub Actions CI runs lint, type-check and tests on every push
- **Done when:** `pnpm dev` shows a placeholder Hygge page and CI is green

### M2 · Core logic (`packages/core`)
- Item catalog (kinds, labels, gender, default interval: 40 days, nails 7)
- `getDueDate`, `getStatus`, `getRemindersFor(date)`, notification text builder
  (explicit/discreet)
- `predictCycle`, `cycleStats`
- Time-zone-safe date helpers
- **Done when:** around 40 unit tests pass, including edge cases: month and leap-year
  boundaries, DST changes, logging the same day twice, back-dated logs

### M3 · Database (`supabase/migrations`)
- Enums: `gender`, `item_kind`, `flow_level`, `channel`
- Tables from PLAN.md §2, plus `updated_at` triggers
- **RLS on every table**: `user_id = auth.uid()`
- Trigger that creates a `profiles` row when someone signs up; a function that adds
  the default items when gender is set or changed
- Generated TypeScript types go into `packages/api`
- **Done when:** the migrations apply cleanly and the RLS tests prove user A can't
  read user B's data

### M4 · Auth & onboarding
- Sign in with Google or an email magic link; protected routes via middleware
- Onboarding (3 steps): name → gender (male/female cards, the theme previews live) →
  time zone (auto-detected) + reminder time (default 9:00)
- **Done when:** a new user can sign up and lands on the dashboard with their
  gender's items already created

### M5 · Dashboard (main screen)
- A card per item: countdown ring ("12 days left"), status color, last done date
- **Mark done**: today in one tap, or pick a past date; undo shown as a toast
- Item settings sheet: enable or disable, interval, lead days, on-due and
  overdue-daily toggles
- Sorting: overdue first, then due today, due soon, ok
- In-app reminders: a banner at the top for overdue and due-today items
- **Done when:** marking an item done resets its countdown; editing the interval
  updates the due date right away

### M6 · History & calendar
- Per-item history (list, edit or delete an entry, notes)
- Month calendar with all items color-coded; tap a day to see what was done
- Stats: on-time streak, average actual interval, last 12 months
- **Done when:** past entries can be fixed and the stats update to match

### M7 · Themes & settings
- Design tokens as CSS variables: `[data-gender=male|female]` × `[data-mode=light|dark]`
  - Male: deep blue / teal / slate
  - Female: rose / pink / lavender
- Settings: profile, gender (as described in §1), time zone, reminder time, dark
  mode (system/light/dark), discreet mode, channel toggles
- **Done when:** both themes look right in both modes and pass WCAG AA contrast checks

### M8 · Reminder delivery
- PWA: manifest, icons, service worker, "Install app" prompt
- Web Push: subscribe/unsubscribe in Settings, stored in `push_subscriptions`;
  dead subscriptions are removed automatically
- Email: React Email templates sent through Resend; one-click unsubscribe link
- Edge Function `send-reminders`, run hourly by `pg_cron`. It picks users whose
  local time is their reminder hour, works out what's due with `packages/core`,
  sends on each enabled channel and records each send in `notification_log`
- `.ics` feed: `/api/calendar/<secret-token>.ics` with each item's next due date
  and the predicted period; the token can be regenerated
- A "Send test notification" button
- **Done when:** a test user gets push + email at their chosen hour, exactly once

### M9 · Menstrual tracking (female)
- Start and end period; a daily log sheet (flow, symptoms chips, mood, note)
- A cycle calendar showing logged period days, predicted period and an estimated
  fertile window
- Stats: average cycle length, average period length, regularity, a chart of past
  cycles
- Reminders for the predicted period through the M8 pipeline
- **Done when:** after 3 cycles have been logged, the predictions and stats match
  values worked out by hand

### M10 · Privacy & account
- Export all data (JSON + CSV zip)
- Delete account: wipes all rows plus the auth user, after typing to confirm
- Privacy page that says plainly what is stored and why
- **Done when:** after deleting an account, the database has zero rows left for that
  user

### M11 · Ship
- Playwright E2E: sign up → onboarding → mark done → change settings
- Accessibility and mobile-layout pass; Lighthouse PWA score ≥ 90
- Deploy: Vercel (web) + Supabase production; environment variables documented in
  `README.md`
- **Done when:** the app works at the live URL and installs as a PWA on Android and iOS

### Later: Phase 3 · Mobile (Expo)
`apps/mobile` reuses `core` and `api`, gets NativeWind themes and Expo push (a
`push_subscriptions` row with `platform = expo`). It ships through EAS Build to
Play Store and App Store.

---

## 3. Working agreement
- One milestone = one or more commits on the dev branch, each with tests.
- I'll pause after **M5**, when you can actually use the core app, for your feedback
  on the look and flow, before going further.
- Things deliberately left out of v1: social features, multiple languages, Hijri
  dates, custom user-created items. Each is easy to add later.
