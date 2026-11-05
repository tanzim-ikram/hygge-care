# Hygge: Build Plan (v1)

This plan breaks [`PLAN.md`](./PLAN.md) into milestones. Each milestone ends in a
working, tested state.

---

## 0. Owner to-do (accounts)

| # | What | Needed for | Notes |
|---|------|-----------|-------|
| 1 | **Supabase** project (free) | M3 | Share the Project URL + anon key. **Enable "Anonymous sign-ins"** in Auth settings. Never share the service-role key in chat or git |
| 2 | **Google OAuth** client | M4 | Pasted into Supabase → Auth → Providers |
| 3 | **Resend** account + API key | M8 | A verified domain is needed to email other people |
| 4 | **Vercel** account linked to the repo | M11 | Free Hobby plan |
| 5 | **Sentry** account (free) | M11 | Optional but recommended |
| 6 | (Optional) a domain | M8/M11 | |
| 7 | Someone knowledgeable to check the Islamic text | before M11 | The 40-day hadith, Dhul Hijjah and ihram notes |

---

## 1. Core rules (`packages/core`, shared by web, mobile and the reminder job)

**Dates** are plain `YYYY-MM-DD` strings. "Today" is always worked out in the user's
time zone.

**Due date** = latest `done_on` + `interval_days`. An item with no log has status
`not_started`.

**Status on date D**

| Status | Condition |
|---|---|
| `ok` | D < due − lead |
| `due_soon` | due − lead ≤ D < due |
| `due_today` | D = due |
| `overdue` | D > due |
| `paused` | D falls inside an ihram/custom pause, or inside the Qurbani window (Islamic mode) |

**Onboarding answers → last done date**
- Today → today
- About a week ago → today − 7
- About 2 weeks ago → today − 14
- Pick a date → that date
- I don't remember → no log, with a friendly "Log it next time you do it" state

**Daily digest for date D** (built once, at the user's reminder hour)
- For each enabled item that isn't paused or snoozed:
  - D = due − lead → `due_soon`
  - D = due and `remind_on_due` → `due_today`
  - due < D ≤ due + 7 and `remind_overdue_daily` → `overdue`
- Islamic mode adds:
  - the Dhul Hijjah alert, 3 days before 1 Dhul Hijjah, if the user plans Qurbani
  - "You can groom again" on the day after the Qurbani day
  - "Ihram is over, time to trim or shave hair" on the day after a pause ends
  - a preferred-day hint
- Female users also get the period prediction alert.
- If nothing is due, nothing is sent.
- The output is a title, a body, and the item IDs (for the Done/Snooze actions), in
  both explicit and discreet wording.
- If the reminder hour falls inside quiet hours, it moves to the end of quiet hours.

**Cycle prediction**
- Average the last 6 cycle lengths, ignoring values outside 15–60 days. Default to
  28 days.
- Period length defaults to 5 days.
- Ovulation ≈ next start − 14, fertile window = ovulation − 5 … ovulation + 1,
  labelled "estimate".
- Regularity: standard deviation ≤ 3 days counts as regular.

**Hijri**
- Dates convert through `Intl` with `islamic-umalqura`, plus the user's offset.
- Finding the next 1 Dhul Hijjah scans forward day by day; it's cheap and has no
  dependency.

**Changing gender**: the new gender's items are switched on. The other gender's items
are switched off, and their history is kept.

---

## 2. Milestones

### M1 · Foundation ✅ done
- pnpm + Turborepo, strict TypeScript, Prettier
- `apps/web` (Next.js + Tailwind), `packages/core`, `packages/config`
- Vitest, and a GitHub Actions CI workflow (type-check, test, build)
- **Done when:** the web app builds, the tests run and CI is green

### M2 · Core logic ✅ done (53 tests)
- Catalog, dates, status, onboarding mapping, digest (with gentle explicit and
  discreet wording), pauses, Qurbani window, preferred day, Hijri, cycle prediction
- **Done when:** a wide unit-test suite passes, covering month and leap-year
  boundaries, quiet hours, the overdue cap, snooze, and pause edge cases

### M2.5 · Design approval 🛑 waiting for the owner
- Mockup: https://claude.ai/artifact/1kvrohodNrh1Xry6Prk57k
- A clickable HTML mockup showing:
  - the onboarding flow
  - the main screen ("Next up" + compact rows + "Log several")
  - the item settings sheet and empty states
  - male and female themes, light and dark ("Moonlit" design system)
  - Islamic and Default mode
- **Owner approves the look before any real screens are built.**

### M3 · Database
- Migrations: enums, the tables from PLAN.md §2, `updated_at` triggers
- **RLS on every table**; anonymous users are covered by the same policies
- A trigger that creates `profiles` on signup; an `apply_gender(gender)` function that
  sets up the items
- Generated types; `packages/api` with typed queries + TanStack Query hooks
- **Done when:** the RLS tests prove isolation between users

### M4 · Auth & onboarding
- An anonymous session on first visit. "Save your data" links Google or an email link
  (Supabase identity linking, so no data is lost)
- The 5-step onboarding from PLAN.md, every step skippable
- **Done when:** a brand-new visitor reaches a populated main screen in under a
  minute, without an account

### M5 · Main screen + logging
- "Next up" card, compact rows, "Log several" sheet, Done + undo, a past-date picker
- Item settings sheet (interval, lead days, rules, Shave/Trim, enabled), with the
  gentle 40-day note in Islamic mode
- Gentle copy and empty states everywhere; in-app banner
- Offline queue for logs
- **Done when:** the full core loop works on a phone-sized screen, online and offline
- 🧪 **Beta checkpoint:** share with friends/family, collect feedback

### M6 · History & calendar
- Per-item history (edit, delete, note), a month calendar with item colors and Hijri
  dates (Islamic mode), streak + average interval

### M7 · Settings & themes
- Light/dark/system; mode switch (Islamic/Default);
  gender; time zone; reminder time; quiet hours; discreet mode; preferred day;
  Qurbani; Hijri offset; ihram/custom pauses; channel toggles
- **Done when:** both gender themes pass WCAG AA contrast in light and dark

### M8 · Reminder delivery
- PWA manifest/icons/service worker, install prompt
- Web Push with **Done ✓ / Snooze** actions (the service worker calls the `action`
  Edge Function)
- Resend email digest with signed one-click "I did it" links
- An hourly `pg_cron` job → the `send-reminders` Edge Function → digest →
  `notification_log` dedupe
- `.ics` feed; a "Send test notification" button
- **Done when:** a test user gets exactly one digest per channel at their hour, and
  the action buttons log or snooze correctly

### M9 · Menstrual tracking
- Start/end period, daily log sheet, cycle calendar with predictions, stats, and
  the digest alert
- **Done when:** after 3 logged cycles, the predictions and stats match values worked
  out by hand

### M10 · Privacy, legal, account
- Export (JSON/CSV), delete account, privacy policy, terms, age gate (13+),
  feedback button, opt-in analytics

### M11 · Ship
- Playwright E2E for the main flows; accessibility and mobile pass; Lighthouse PWA
  score ≥ 90
- Sentry; deploy to Vercel + Supabase production; README with setup and environment
  variables
- **Done when:** the app is live and installs on Android and iOS

---

## 3. Later

- **v1.1:** period tracking with Islamic rules (haid/tuhr per madhhab, a ghusl
  reminder when the period ends, a missed-fasts counter), pregnancy/nifas mode,
  more languages (Bangla first).
- **Phase 3, mobile (Expo):** shared `core`/`api`, **app lock (PIN/biometrics)**,
  Expo push with actions, a home-screen widget, store releases.

## 4. Working agreement
- Commits go to the dev branch, each milestone with tests.
- **Stops for the owner:** after M2.5 (design approval) and after M5 (beta feedback).
