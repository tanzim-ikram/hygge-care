import { addDays, diffDays, type LocalDate } from "./dates.js";

export interface Cycle {
  start: LocalDate;
  /** Last day of bleeding, or null while the period is ongoing / not recorded. */
  end: LocalDate | null;
}

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
export const MIN_CYCLE = 15;
export const MAX_CYCLE = 60;
export const MAX_PERIOD = 15;
export const CYCLES_TO_AVERAGE = 6;
export const REGULAR_STDDEV_DAYS = 3;

export interface CycleStats {
  /** Usable cycle lengths, oldest first (at most the last 6). */
  cycleLengths: number[];
  periodLengths: number[];
  avgCycleLength: number;
  avgPeriodLength: number;
  /** True when the averages come from the defaults instead of your own data. */
  usingDefaults: boolean;
  stdDev: number | null;
  /** null until there are at least 3 cycle lengths. */
  regular: boolean | null;
}

function sortCycles(cycles: readonly Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

function mean(xs: readonly number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function cycleStats(cycles: readonly Cycle[]): CycleStats {
  const sorted = sortCycles(cycles);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = diffDays(sorted[i]!.start, sorted[i - 1]!.start);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) lengths.push(len);
  }
  const cycleLengths = lengths.slice(-CYCLES_TO_AVERAGE);
  const periodLengths = sorted
    .filter((c): c is Cycle & { end: LocalDate } => c.end !== null)
    .map((c) => diffDays(c.end, c.start) + 1)
    .filter((n) => n >= 1 && n <= MAX_PERIOD)
    .slice(-CYCLES_TO_AVERAGE);

  const avgCycleLength = cycleLengths.length
    ? Math.round(mean(cycleLengths))
    : DEFAULT_CYCLE_LENGTH;
  const avgPeriodLength = periodLengths.length
    ? Math.round(mean(periodLengths))
    : DEFAULT_PERIOD_LENGTH;
  let stdDev: number | null = null;
  if (cycleLengths.length >= 2) {
    const m = mean(cycleLengths);
    stdDev = Math.round(Math.sqrt(mean(cycleLengths.map((x) => (x - m) ** 2))) * 10) / 10;
  }
  return {
    cycleLengths,
    periodLengths,
    avgCycleLength,
    avgPeriodLength,
    usingDefaults: cycleLengths.length === 0,
    stdDev,
    regular: cycleLengths.length >= 3 && stdDev !== null ? stdDev <= REGULAR_STDDEV_DAYS : null,
  };
}

export interface CyclePrediction {
  lastStart: LocalDate;
  nextStart: LocalDate;
  nextEnd: LocalDate;
  /** Estimate only. */
  ovulation: LocalDate;
  fertileStart: LocalDate;
  fertileEnd: LocalDate;
  /** Days until the next period; negative means it is late. */
  daysUntil: number;
  /** True while today falls inside the latest logged period. */
  onPeriod: boolean;
  /** Day of the current cycle (day 1 = first day of the period). */
  cycleDay: number;
  stats: CycleStats;
}

export function predictCycle(cycles: readonly Cycle[], today: LocalDate): CyclePrediction | null {
  const sorted = sortCycles(cycles).filter((c) => c.start <= today);
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const stats = cycleStats(sorted);
  const nextStart = addDays(last.start, stats.avgCycleLength);
  const ovulation = addDays(nextStart, -14);
  const periodEnd = last.end ?? addDays(last.start, stats.avgPeriodLength - 1);
  return {
    lastStart: last.start,
    nextStart,
    nextEnd: addDays(nextStart, stats.avgPeriodLength - 1),
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: addDays(ovulation, 1),
    daysUntil: diffDays(nextStart, today),
    onPeriod: today >= last.start && today <= periodEnd,
    cycleDay: diffDays(today, last.start) + 1,
    stats,
  };
}

export type FlowLevel = "spotting" | "light" | "medium" | "heavy";
export const FLOW_LEVELS: readonly FlowLevel[] = ["spotting", "light", "medium", "heavy"];
export const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Back pain",
  "Tender breasts",
  "Acne",
  "Fatigue",
  "Nausea",
  "Cravings",
  "Trouble sleeping",
] as const;
export const MOODS = [
  "Happy",
  "Calm",
  "Sensitive",
  "Sad",
  "Irritable",
  "Anxious",
  "Energetic",
  "Tired",
] as const;
