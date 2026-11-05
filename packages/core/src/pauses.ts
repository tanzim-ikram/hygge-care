import { isWithin, type LocalDate } from "./dates.js";

export type PauseKind = "ihram" | "custom";

export interface Pause {
  id: string;
  kind: PauseKind;
  start: LocalDate;
  end: LocalDate;
}

export function activePause(pauses: readonly Pause[], date: LocalDate): Pause | null {
  return pauses.find((p) => isWithin(date, p.start, p.end)) ?? null;
}

export function validatePause(p: Pick<Pause, "start" | "end">): string | null {
  if (p.end < p.start) return "The end date must be on or after the start date.";
  return null;
}
