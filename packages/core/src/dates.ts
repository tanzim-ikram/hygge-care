/**
 * Calendar dates are plain `YYYY-MM-DD` strings with no time and no time zone.
 * All arithmetic goes through UTC midnight, so it never drifts across DST changes.
 */
export type LocalDate = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function assertLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) throw new RangeError(`Invalid date: ${value}`);
  return value;
}

export function toUtcMs(date: LocalDate): number {
  const m = DATE_RE.exec(date);
  if (!m || !isLocalDate(date)) throw new RangeError(`Invalid date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function fromUtcMs(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY_MS);
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxDate(dates: readonly LocalDate[]): LocalDate | null {
  let max: LocalDate | null = null;
  for (const d of dates) if (max === null || d > max) max = d;
  return max;
}

/** Inclusive range check. */
export function isWithin(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
  return date >= start && date <= end;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: LocalDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function zonedParts(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** The calendar date it currently is in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return zonedParts(timeZone, now).date;
}

/** The hour (0–23) it currently is in `timeZone`. */
export function hourIn(timeZone: string, now: Date = new Date()): number {
  return zonedParts(timeZone, now).hour;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${Math.abs(n) === 1 ? one : many}`;
}
