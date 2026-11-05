# Hygge: Requirements & Technical Plan

Hygge is a gentle personal-care tracker. The user logs the day they groomed (e.g.
removed pubic hair). Hygge counts down to the next deadline (40 days by default)
and reminds them before it passes. Women also get a detailed menstrual cycle tracker.

It has two modes:
- **Islamic mode** follows the *sunan al-fitrah*. It adds Hijri dates, Dhul Hijjah
  and ihram awareness, and short hadith references.
- **Default mode** is a plain grooming tracker with no religious content.

Platforms: **web first** (installable PWA), then **Android + iOS** with shared code.
Language: **English only** for v1. All text goes through one strings file, so other
languages can be added later.

---

## 1. Requirements (v1, confirmed with the owner)

### Accounts
- **Try without an account.** The first visit creates an anonymous Supabase session,
  so users can start right away. Linking Google or an email link later keeps all
  their data.
  - A soft banner suggests saving: "Keep your data safe. Create a free account."
  - Anonymous users get in-app reminders, push notifications and the calendar feed.
    Email reminders need a linked email.
- Full accounts sign in with Google or an email magic link, and sync across devices.

### Onboarding (about 1 minute; every step can be skipped and changed later)
1. **Mode**: Islamic or Default, with a one-line explanation of each
2. **Gender**: male or female. This sets the item list and the theme, which
   previews live. Males also choose beard **Shave** or **Trim**
3. **"When did you last…?"** for each item: Today · About a week ago · About 2 weeks
   ago · Pick a date · I don't remember
4. **Reminders**: time of day (default 9:00, time zone auto-detected) and a
   **discreet notifications** choice, shown with previews of both styles
5. Islamic mode only: **preferred grooming day** (e.g. Friday, or none) and
   "Are you planning Qurbani this year?"

### Tracker items

| Item | Male | Female | Default interval |
|------|:----:|:------:|-----------------:|
| Pubic hair | ✅ | ✅ | 40 days |
| Armpit hair | ✅ | ✅ | 40 days |
| Nails | ✅ | ✅ | **7 days** |
| Head hair | ✅ | ✅ | 40 days |
| Beard (Shave or Trim, user's choice) | ✅ | | 40 days |
| Moustache (trim) | ✅ | | 40 days |
| Body hair | | ✅ | 40 days |
| Facial hair | | ✅ | 40 days |
| Menstrual cycle | | ✅ | predicted |

- Each item can be enabled or disabled, and its interval and reminder rules can be
  edited.
- **Log one:** the "Done" button logs today in one tap; you can also pick a past
  date. An undo toast follows.
- **Log several:** tick several items at once and save once.
- In Islamic mode, an interval above 40 days for a fitrah item (pubic hair,
  armpits, nails, moustache) is still allowed, with a gentle note that the sunnah
  limit is 40 days.

### Reminders
- **One daily digest:** everything due that day goes in a single notification
  ("3 things due today: armpits, pubic hair, nails").
- Per-item rules: lead time (default 3 days before), on the due day, and daily once
  overdue, **stopping after 7 overdue days**.
- **Quiet hours** (default 22:00–07:00): nothing is sent then.
- **Actions in the reminder:** push notifications have **Done ✓** and **Snooze 1 day**
  buttons; emails have a one-click "I did it" link (a signed, single-use token).
- **Discreet mode** (chosen at onboarding, off by default): push titles, email
  subjects and calendar titles say only "Hygge: a reminder is due". The details show
  only inside the app.
- Channels, each with its own toggle:
  - in-app
  - browser push (PWA; on iOS it needs "Add to Home Screen")
  - email
  - private `.ics` calendar feed

### Islamic-mode features
- **Hijri date** next to Gregorian dates, using the Umm al-Qura calendar, with a
  ±2-day adjustment for local moon sighting.
- **Preferred day:** if a preferred weekday falls before the deadline, Hygge
  suggests it ("Friday is 2 days away, a good day for it").
- **Dhul Hijjah / Qurbani:** for users who plan Qurbani:
  - an alert 3 days before 1 Dhul Hijjah ("Groom before Dhul Hijjah begins")
  - grooming reminders paused from 1 Dhul Hijjah until the sacrifice day
    (10 Dhul Hijjah by default, editable)
  - then a reminder: "Your Qurbani is done. You can groom again."
  - Source: Sahih Muslim, Umm Salamah
- **Ihram pause:** the user sets Hajj/Umrah dates. Grooming reminders pause for that
  time, and Hygge reminds them to trim or shave hair when ihram ends.
- **"Why 40 days?"** card: the Anas hadith (Sahih Muslim) with its source. The text
  should be checked by someone knowledgeable before launch.

### Menstrual tracking (detailed)
- Log period start and end. Daily log: flow, symptoms, mood, note.
- Predicts the next period from the average of the last 6 cycles (28 days until
  there's enough data). The fertile window is labelled "estimate only".
- Reminder "Your period is expected in N days" (default 2), sent in the daily digest.
- Stats: average cycle and period length, regularity.
- *v1.1:* period tracking with Islamic rules (haid/tuhr per madhhab, a ghusl reminder
  when the period ends, a counter for missed Ramadan fasts) and a pregnancy/nifas
  mode.

### Main screen (kept simple)
- A night-sky panel at the top shows the most urgent item as a **square, realistic
  growth illustration** (200×200, rounded): hair growing out of a skin cross-section
  (nails: a fingertip whose nail grows past the skin). It also has **I did it
  today** and **Tomorrow** (snooze).
- Below it, **Your care**: a 2-column grid of every item (including the one in Next
  up), each with a small version of the same illustration, its name, "12 days
  left" and a one-tap check button.
- A floating **"Log several"** button, within thumb reach on mobile.
- Bottom navigation: **Today · Calendar · Cycle** (female only) **· Settings**.

### Design system
- **The growth illustration** is the signature visual. It is a cross-section of
  skin (surface, follicle openings, pores, roots and bulbs underneath) with
  tapered, slightly curved hairs growing out of it. Hair length follows the
  countdown: it reaches full length on the due date (no due line or label).
  Past due, it keeps growing, a little longer, and the frame glows amber.
  - Hair type changes per item: curly (pubic), wavy (armpit), straighter and
    longer (head hair), coarse (beard, moustache), fine and lighter (body and
    facial hair).
  - Nails are a fingertip whose white free edge grows past the skin.
  - It is generated in code (`hairScene` / `nailScene`), so it scales from the
    56px tile to the large hero.
  - It appears only where real progress is shown: the Today screen, item settings
    and history. Onboarding uses its own visuals instead: a cluster of grooming-tool
    tiles (scissors, razor, comb, clipper), a gold step icon with a progress bar,
    male/female symbols, and line icons for each item.
  - v1 uses one medium skin tone and dark hair. A skin-tone and hair-color
    setting is a planned follow-up.
- **Cycle orbit:** a ring of 28 dots. Period days are drops, the estimated fertile
  window is outlined, and today is gold.
- **The sky:** each main screen opens with a night-sky panel with soft stars.
- **Gold `#F4BE4F` is the only action color** (primary buttons, the "on" switch
  knob) in both themes. The gender tint is for selection and accents.
- Type: Bricolage Grotesque (display, titles, numbers) + Figtree (body).
- Shape: pills for every button, chip and field; 28px cards; 40px sky edge; 36px
  sheets.
- The same tokens and components are used on every screen. The mockup's design
  system board is the source of truth:
  https://claude.ai/artifact/1kvrohodNrh1Xry6Prk57k

### Gentle language & empty states
- Calm wording throughout, never alarming:

  | Situation | Wording |
  |---|---|
  | On track | "You're on track" |
  | Due soon | "Coming up in 3 days" |
  | Due today | "Today's a good day for it" |
  | Overdue | "It's been a little while. Whenever you're ready" (soft amber, never red) |

- Every empty screen explains what will appear there and has one clear button:
  - no history yet → "Your history will grow here. Log your first one."
  - no cycles yet → "Log your last period to see predictions."

### History & stats
- History for each item (edit or delete entries, add notes).
- A month **calendar** where each item has its own color.
- An on-time streak and the average actual interval.

### Themes
- One theme per gender, so every screen stays consistent:
  - Male: **Indigo night** (indigo sky, mist background, indigo tint)
  - Female: **Plum dusk** (plum sky, blush background, raspberry tint)
  - Shared: gold `#F4BE4F` for every primary action
- Light, dark or follow the system.

### Offline
- The PWA caches the app shell. Logs made while offline are kept on the device
  (TanStack Query persistence plus a queue of pending changes) and sync when the
  connection returns.

### Privacy & data
- Row-Level Security on every table: each user can only read their own data.
- Export all data (JSON/CSV). Delete the account completely.
- A privacy policy and terms of use. Minimum age 13. Menstrual data is treated as
  sensitive health data.
- Error tracking (Sentry) and opt-in, privacy-friendly analytics. A feedback button
  in Settings.

### Mobile version (phase 3)
- **App lock** with PIN or biometrics, home-screen widget, Expo push.

---

## 2. Chosen stack

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | **pnpm workspaces + Turborepo** | Web and mobile share packages |
| Web app | **Next.js (App Router) + React + TypeScript** | Mature and free to host on Vercel |
| UI | **Tailwind CSS + shadcn/ui**, themes as CSS variables | Theme × light/dark switching is easy |
| PWA / push | Service worker + **Web Push (VAPID)**; notification action buttons | Free, no third party |
| Offline | TanStack Query persistence (IndexedDB) + a mutation queue | Logging works without a connection |
| Mobile (later) | **Expo (React Native) + NativeWind** | Reuses `packages/core` and `packages/api` |
| Backend | **Supabase**: Postgres, Auth (incl. anonymous sign-in), RLS, Edge Functions, `pg_cron` | One free service |
| Reminder engine | `pg_cron` runs an Edge Function hourly; it builds each user's digest with `packages/core` | Time-zone correct, no duplicates |
| Email | **Resend** + React Email | Free tier |
| Validation | **Zod** | Shared across web, mobile and Edge Functions |
| Dates | Plain `YYYY-MM-DD` dates + the user's IANA time zone; Hijri via `Intl` (`islamic-umalqura`) | No timezone drift, no extra dependency |
| Testing | **Vitest** + **Playwright** | |
| Monitoring | Sentry (free tier) | |
| Hosting | Vercel + Supabase + Resend free tiers | $0 at small scale |

### Repository layout
```
hygge-care/
├─ apps/
│  ├─ web/            Next.js PWA
│  └─ mobile/         Expo app (phase 3)
├─ packages/
│  ├─ core/           pure TS: catalog, due dates, digest, Hijri, cycle prediction, copy
│  ├─ api/            typed Supabase queries + TanStack Query hooks (M3+)
│  └─ config/         shared tsconfig
├─ supabase/
│  ├─ migrations/     SQL schema + RLS policies
│  └─ functions/      send-reminders, ics-feed, action (Done/Snooze links)
└─ docs/
```

### Data model
- `profiles`: id, display_name, gender, mode (`islamic|default`),
  theme_mode, timezone, reminder_hour, quiet_start, quiet_end, discreet,
  preferred_weekday, plans_qurbani, qurbani_day, hijri_offset, channel toggles,
  ics_token
- `tracker_items`: id, user_id, kind, variant (`shave|trim`), interval_days,
  lead_days, remind_on_due, remind_overdue_daily, snoozed_until, enabled
- `grooming_logs`: id, user_id, item_id, done_on, note
- `pauses`: id, user_id, kind (`ihram|custom`), start_date, end_date
- `cycles`: id, user_id, start_date, end_date
- `cycle_day_logs`: user_id, date, flow, symptoms[], mood, note
- `push_subscriptions`: user_id, platform, endpoint, keys, user_agent
- `notification_log`: user_id, for_date, channel. Unique per day, so each channel
  sends at most one digest a day
- `action_tokens`: token hash, user_id, item_id, action, expires_at, used_at

---

## 3. Decisions log
- Beard: the user chooses Shave or Trim (default Trim). The label follows the choice.
- Moustache (trim): a standard male item, 40 days.
- Nails default to 7 days; everything else defaults to 40.
- Discreet mode: optional and off by default, but **offered during onboarding**.
- Overdue reminders stop after 7 days. One digest per day, never one message per item.
- Islamic mode is the default choice in onboarding; Default mode removes all
  religious content.
- English only for v1.
- Build plan: [`BUILD_PLAN.md`](./BUILD_PLAN.md).
