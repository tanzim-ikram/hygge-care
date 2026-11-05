/**
 * All user-facing wording lives here: calm, gentle, never alarming.
 * Keep it in one place so other languages can be added later.
 */
import { plural } from "./dates.js";
import type { ItemState } from "./status.js";

export const APP_NAME = "Hygge";

export function statusHeadline(state: ItemState): string {
  switch (state.status) {
    case "not_started":
      return "Log it next time you do it";
    case "ok":
      return "You're on track 🌿";
    case "due_soon":
      return `Coming up in ${plural(state.daysLeft ?? 0, "day")}`;
    case "due_today":
      return "Today's a good day for it";
    case "overdue":
      return "It's been a little while. Whenever you're ready";
    case "paused":
      return pausedLabel(state.pausedBy);
  }
}

/** Short text for compact rows, e.g. "12 days left". */
export function rowSubtitle(state: ItemState): string {
  switch (state.status) {
    case "not_started":
      return "Not logged yet";
    case "paused":
      return pausedLabel(state.pausedBy);
    case "due_today":
      return "Today";
    case "overdue":
      return `${plural(-(state.daysLeft ?? 0), "day")} past`;
    default:
      return `${plural(state.daysLeft ?? 0, "day")} left`;
  }
}

function pausedLabel(by: ItemState["pausedBy"]): string {
  if (by === "ihram") return "Paused during ihram";
  if (by === "qurbani") return "Paused until your Qurbani";
  return "Paused";
}

export const EMPTY_STATES = {
  history: {
    title: "Your history will grow here",
    body: "Each time you log, it shows up here so you can see your rhythm.",
    action: "Log your first one",
  },
  cycle: {
    title: "Let's get to know your cycle",
    body: "Log your last period and Hygge will gently predict the next one.",
    action: "Log last period",
  },
  calendar: {
    title: "Nothing on this day",
    body: "Days you log will be colored in here.",
    action: "Log something",
  },
  allDone: {
    title: "All caught up 🌿",
    body: "Nothing needs your attention right now.",
    action: null,
  },
  noItems: {
    title: "No items turned on",
    body: "Choose what you'd like Hygge to keep track of.",
    action: "Choose items",
  },
} as const;

export const GUEST_BANNER = {
  title: "Keep your data safe",
  body: "You're using Hygge as a guest. Create a free account so you never lose your history.",
  action: "Create free account",
};

export const DISCREET_TITLE = APP_NAME;
export function discreetBody(count: number): string {
  return count === 1
    ? "You have a gentle reminder. Open Hygge to see it."
    : `You have ${count} gentle reminders. Open Hygge to see them.`;
}

/** Islamic-mode references. To be checked by a knowledgeable person before launch. */
export const ISLAMIC_REFERENCES = {
  fortyDays: {
    title: "Why 40 days?",
    text:
      'Anas ibn Malik said: "A time limit was set for us for trimming the moustache, clipping the nails, ' +
      'plucking the armpit hair and shaving the pubic hair: that we should not leave it for more than forty nights."',
    source: "Sahih Muslim 258",
  },
  qurbani: {
    title: "Dhul Hijjah and Qurbani",
    text:
      'The Prophet ﷺ said: "When the ten days begin and one of you intends to offer a sacrifice, ' +
      'let him not remove anything of his hair or his skin (nails)."',
    source: "Sahih Muslim 1977",
  },
  ihram: {
    title: "Ihram",
    text:
      "Cutting hair and nails is not allowed while in ihram. Hygge pauses grooming reminders " +
      "and reminds you to shave or trim your hair when you leave ihram.",
    source: null,
  },
} as const;
