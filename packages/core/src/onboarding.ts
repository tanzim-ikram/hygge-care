import { addDays, isLocalDate, type LocalDate } from "./dates.js";

export type LastDoneAnswer =
  | { kind: "today" }
  | { kind: "week_ago" }
  | { kind: "two_weeks_ago" }
  | { kind: "date"; date: LocalDate }
  | { kind: "unknown" };

export const LAST_DONE_OPTIONS = [
  { kind: "today", label: "Today" },
  { kind: "week_ago", label: "About a week ago" },
  { kind: "two_weeks_ago", label: "About 2 weeks ago" },
  { kind: "date", label: "Pick a date" },
  { kind: "unknown", label: "I don't remember" },
] as const;

/** Turns an onboarding answer into the date to log, or null for "I don't remember". */
export function lastDoneFromAnswer(answer: LastDoneAnswer, today: LocalDate): LocalDate | null {
  switch (answer.kind) {
    case "today":
      return today;
    case "week_ago":
      return addDays(today, -7);
    case "two_weeks_ago":
      return addDays(today, -14);
    case "date":
      if (!isLocalDate(answer.date)) throw new RangeError(`Invalid date: ${answer.date}`);
      if (answer.date > today) throw new RangeError("The date can't be in the future.");
      return answer.date;
    case "unknown":
      return null;
  }
}
