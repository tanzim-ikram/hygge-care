import { hourIn } from "./dates.js";

export interface SendWindow {
  timezone: string;
  /** 0–23 */
  reminderHour: number;
  /** Quiet hours, e.g. 22 → 7. Equal values mean no quiet hours. */
  quietStart: number;
  quietEnd: number;
}

export function isQuietHour(hour: number, quietStart: number, quietEnd: number): boolean {
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd
    ? hour >= quietStart && hour < quietEnd
    : hour >= quietStart || hour < quietEnd;
}

/** The hour the digest is actually sent: reminder hour, moved to the end of quiet hours if needed. */
export function effectiveSendHour(w: Omit<SendWindow, "timezone">): number {
  return isQuietHour(w.reminderHour, w.quietStart, w.quietEnd) ? w.quietEnd : w.reminderHour;
}

/** True during the hour the hourly job should send this user's digest. */
export function isSendHour(w: SendWindow, now: Date = new Date()): boolean {
  return hourIn(w.timezone, now) === effectiveSendHour(w);
}
