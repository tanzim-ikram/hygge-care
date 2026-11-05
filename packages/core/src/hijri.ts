import { addDays, toUtcMs, type LocalDate } from "./dates.js";

export interface HijriDate {
  year: number;
  /** 1 = Muharram … 12 = Dhul Hijjah */
  month: number;
  day: number;
}

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qa'dah",
  "Dhul Hijjah",
] as const;

export const DHUL_HIJJAH = 12;

let formatter: Intl.DateTimeFormat | null = null;
function getFormatter(): Intl.DateTimeFormat {
  formatter ??= new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  return formatter;
}

/**
 * Hijri (Umm al-Qura) date for a Gregorian date. `offset` (−2…+2) adjusts for local
 * moon sighting: −1 means the local calendar runs one day behind Umm al-Qura.
 */
export function toHijri(date: LocalDate, offset = 0): HijriDate {
  const parts = getFormatter().formatToParts(new Date(toUtcMs(addDays(date, offset))));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function formatHijri(date: LocalDate, offset = 0): string {
  const h = toHijri(date, offset);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

/** First Gregorian date on or after `from` whose Hijri date is `month`/`day`. */
export function findNextHijriDate(
  month: number,
  day: number,
  from: LocalDate,
  offset = 0,
  searchDays = 400,
): LocalDate | null {
  for (let i = 0; i <= searchDays; i++) {
    const d = addDays(from, i);
    const h = toHijri(d, offset);
    if (h.month === month && h.day === day) return d;
  }
  return null;
}

export interface QurbaniWindow {
  /** 1 Dhul Hijjah */
  start: LocalDate;
  /** The sacrifice day (10 Dhul Hijjah by default). Grooming is paused through this day. */
  end: LocalDate;
}

/**
 * The current or next Dhul Hijjah grooming pause for someone offering Qurbani
 * (Sahih Muslim 1977). If today is inside this year's window, that window is returned.
 */
export function qurbaniWindow(today: LocalDate, offset = 0, qurbaniDay = 10): QurbaniWindow | null {
  const day = Math.min(Math.max(Math.round(qurbaniDay), 10), 13);
  const start = findNextHijriDate(DHUL_HIJJAH, 1, addDays(today, -day), offset);
  if (!start) return null;
  const window = { start, end: addDays(start, day - 1) };
  if (window.end >= today) return window;
  const next = findNextHijriDate(DHUL_HIJJAH, 1, addDays(window.end, 1), offset);
  return next ? { start: next, end: addDays(next, day - 1) } : null;
}
