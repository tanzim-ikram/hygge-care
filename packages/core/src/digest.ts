import {
  OVERDUE_REMINDER_CAP_DAYS,
  type AppMode,
  type Gender,
  type ItemSettings,
} from "./catalog.js";
import { DISCREET_TITLE, APP_NAME, discreetBody } from "./copy.js";
import { addDays, diffDays, plural, weekday, WEEKDAY_NAMES, type LocalDate } from "./dates.js";
import { qurbaniWindow } from "./hijri.js";
import type { Pause } from "./pauses.js";
import { predictCycle, type Cycle } from "./cycle.js";
import { getItemState, lastDoneFor, type GroomingLog } from "./status.js";

export interface DigestProfile {
  gender: Gender;
  mode: AppMode;
  discreet: boolean;
  /** 0 = Sunday … 6 = Saturday; null = no preference. */
  preferredWeekday: number | null;
  plansQurbani: boolean;
  /** Hijri day of the sacrifice (10–13). */
  qurbaniDay: number;
  hijriOffset: number;
  /** Days before the predicted period to remind. */
  periodLeadDays: number;
}

export type DigestEntryType =
  | "due_soon"
  | "due_today"
  | "overdue"
  | "preferred_day"
  | "dhul_hijjah_soon"
  | "qurbani_over"
  | "pause_over"
  | "period_soon";

export interface DigestEntry {
  type: DigestEntryType;
  /** Items this line is about (used by the Done ✓ / Snooze actions). */
  itemIds: string[];
  text: string;
}

export interface Digest {
  date: LocalDate;
  entries: DigestEntry[];
  /** Items the Done ✓ / Snooze actions apply to. */
  itemIds: string[];
  title: string;
  body: string;
  /** Lock-screen-safe wording, used when the user has discreet mode on. */
  discreetTitle: string;
  discreetBody: string;
}

export interface DigestInput {
  date: LocalDate;
  profile: DigestProfile;
  items: readonly ItemSettings[];
  logs: readonly GroomingLog[];
  pauses?: readonly Pause[];
  cycles?: readonly Cycle[];
}

const DHUL_HIJJAH_ALERT_DAYS = 3;

/**
 * Builds the one notification a user gets today, or null if there is nothing to say.
 * Used by the hourly reminder job (email/push) and by the in-app banner.
 */
export function buildDigest(input: DigestInput): Digest | null {
  const { date, profile } = input;
  const islamic = profile.mode === "islamic";
  const pauses = (input.pauses ?? []).filter((p) => islamic || p.kind !== "ihram");
  const qurbani =
    islamic && profile.plansQurbani
      ? qurbaniWindow(date, profile.hijriOffset, profile.qurbaniDay)
      : null;
  // The window that just ended (for the "you can groom again" message).
  const qurbaniYesterday =
    islamic && profile.plansQurbani
      ? qurbaniWindow(addDays(date, -1), profile.hijriOffset, profile.qurbaniDay)
      : null;

  const entries: DigestEntry[] = [];
  const soonButNotToday: { id: string; task: string }[] = [];

  for (const item of input.items) {
    if (!item.enabled) continue;
    const lastDone = lastDoneFor(input.logs, item.id);
    if (!lastDone) continue;
    const state = getItemState(item, lastDone, date, { pauses, qurbani });
    if (state.status === "paused" || state.daysLeft === null) continue;
    if (item.snoozedUntil && date < item.snoozedUntil) continue;

    const d = state.daysLeft;
    const snoozeEndsToday = item.snoozedUntil === date;
    const task = state.task;

    if (d > 0 && (d === item.leadDays || (snoozeEndsToday && d <= item.leadDays))) {
      entries.push({
        type: "due_soon",
        itemIds: [item.id],
        text: `${task} in ${plural(d, "day")}`,
      });
    } else if (d === 0 && (item.remindOnDue || snoozeEndsToday)) {
      entries.push({
        type: "due_today",
        itemIds: [item.id],
        text: `${task}: today's a good day for it`,
      });
    } else if (
      d < 0 &&
      -d <= OVERDUE_REMINDER_CAP_DAYS &&
      (item.remindOverdueDaily || snoozeEndsToday)
    ) {
      entries.push({
        type: "overdue",
        itemIds: [item.id],
        text: `${task}: it's been ${plural(-d, "day")} past. Whenever you're ready`,
      });
    } else if (d > 0 && d <= item.leadDays) {
      soonButNotToday.push({ id: item.id, task });
    }
  }

  // Preferred day: a gentle nudge for items coming up soon that weren't mentioned today.
  if (
    profile.preferredWeekday !== null &&
    weekday(date) === profile.preferredWeekday &&
    soonButNotToday.length
  ) {
    const tasks = soonButNotToday.map((s) => s.task.toLowerCase()).join(", ");
    entries.push({
      type: "preferred_day",
      itemIds: soonButNotToday.map((s) => s.id),
      text: `It's ${WEEKDAY_NAMES[profile.preferredWeekday]}, a good day for ${tasks}`,
    });
  }

  if (qurbani && diffDays(qurbani.start, date) === DHUL_HIJJAH_ALERT_DAYS) {
    entries.push({
      type: "dhul_hijjah_soon",
      itemIds: [],
      text: `Dhul Hijjah begins in ${plural(DHUL_HIJJAH_ALERT_DAYS, "day")}. Groom now if you're offering Qurbani`,
    });
  }
  if (qurbaniYesterday && qurbaniYesterday.end === addDays(date, -1)) {
    entries.push({
      type: "qurbani_over",
      itemIds: [],
      text: "May Allah accept your Qurbani. You can groom again now",
    });
  }

  for (const p of pauses) {
    if (addDays(p.end, 1) !== date) continue;
    entries.push({
      type: "pause_over",
      itemIds: [],
      text:
        p.kind === "ihram"
          ? "Your ihram is over. Time to shave or trim your hair"
          : "Your pause has ended. Reminders are back on",
    });
  }

  if (profile.gender === "female" && input.cycles?.length) {
    const prediction = predictCycle(input.cycles, date);
    if (
      prediction &&
      !prediction.onPeriod &&
      prediction.daysUntil === profile.periodLeadDays &&
      profile.periodLeadDays > 0
    ) {
      entries.push({
        type: "period_soon",
        itemIds: [],
        text: `Your period is expected in ${plural(prediction.daysUntil, "day")}`,
      });
    }
  }

  if (!entries.length) return null;

  const itemIds = [...new Set(entries.flatMap((e) => e.itemIds))];
  const title =
    entries.length === 1 ? APP_NAME : `${APP_NAME} · ${plural(entries.length, "gentle reminder")}`;
  return {
    date,
    entries,
    itemIds,
    title,
    body: entries.map((e) => e.text).join("\n"),
    discreetTitle: DISCREET_TITLE,
    discreetBody: discreetBody(entries.length),
  };
}

/** What a channel actually sends, respecting the user's discreet setting. */
export function digestMessage(digest: Digest, discreet: boolean): { title: string; body: string } {
  return discreet
    ? { title: digest.discreetTitle, body: digest.discreetBody }
    : { title: digest.title, body: digest.body };
}
