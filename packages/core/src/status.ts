import { catalogEntry, displayName, taskName, type ItemSettings } from "./catalog.js";
import { addDays, diffDays, isWithin, maxDate, type LocalDate } from "./dates.js";
import type { QurbaniWindow } from "./hijri.js";
import { activePause, type Pause } from "./pauses.js";

export type ItemStatus = "not_started" | "ok" | "due_soon" | "due_today" | "overdue" | "paused";

export interface GroomingLog {
  itemId: string;
  doneOn: LocalDate;
}

export interface StatusContext {
  pauses?: readonly Pause[];
  /** Only pass this for Islamic-mode users who plan Qurbani. */
  qurbani?: QurbaniWindow | null;
}

export interface ItemState {
  item: ItemSettings;
  name: string;
  task: string;
  emoji: string;
  lastDone: LocalDate | null;
  dueDate: LocalDate | null;
  /** Days until the due date: 0 = today, negative = past. */
  daysLeft: number | null;
  status: ItemStatus;
  /** 0…1, the share of the interval that has passed (for the progress ring). */
  progress: number;
  pausedBy: "ihram" | "custom" | "qurbani" | null;
}

export function getDueDate(lastDone: LocalDate, intervalDays: number): LocalDate {
  return addDays(lastDone, intervalDays);
}

export function lastDoneFor(logs: readonly GroomingLog[], itemId: string): LocalDate | null {
  return maxDate(logs.filter((l) => l.itemId === itemId).map((l) => l.doneOn));
}

export function pauseReason(
  date: LocalDate,
  ctx: StatusContext,
): "ihram" | "custom" | "qurbani" | null {
  const p = activePause(ctx.pauses ?? [], date);
  if (p) return p.kind;
  if (ctx.qurbani && isWithin(date, ctx.qurbani.start, ctx.qurbani.end)) return "qurbani";
  return null;
}

export function getItemState(
  item: ItemSettings,
  lastDone: LocalDate | null,
  today: LocalDate,
  ctx: StatusContext = {},
): ItemState {
  const base = {
    item,
    name: displayName(item.kind, item.variant),
    task: taskName(item.kind, item.variant),
    emoji: catalogEntry(item.kind).emoji,
    lastDone,
  };
  const pausedBy = pauseReason(today, ctx);
  if (!lastDone) {
    return {
      ...base,
      dueDate: null,
      daysLeft: null,
      status: pausedBy ? "paused" : "not_started",
      progress: 0,
      pausedBy,
    };
  }
  const dueDate = getDueDate(lastDone, item.intervalDays);
  const daysLeft = diffDays(dueDate, today);
  const elapsed = diffDays(today, lastDone);
  const progress = Math.min(1, Math.max(0, elapsed / item.intervalDays));
  let status: ItemStatus;
  if (pausedBy) status = "paused";
  else if (daysLeft < 0) status = "overdue";
  else if (daysLeft === 0) status = "due_today";
  else if (daysLeft <= item.leadDays) status = "due_soon";
  else status = "ok";
  return { ...base, dueDate, daysLeft, status, progress, pausedBy };
}

export function getItemStates(
  items: readonly ItemSettings[],
  logs: readonly GroomingLog[],
  today: LocalDate,
  ctx: StatusContext = {},
): ItemState[] {
  return items
    .filter((i) => i.enabled)
    .map((i) => getItemState(i, lastDoneFor(logs, i.id), today, ctx));
}

const STATUS_RANK: Record<ItemStatus, number> = {
  overdue: 0,
  due_today: 1,
  due_soon: 2,
  ok: 3,
  not_started: 4,
  paused: 5,
};

/** Most urgent first: overdue, due today, due soon, ok (fewest days first), not started, paused. */
export function sortByUrgency(states: readonly ItemState[]): ItemState[] {
  return [...states].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) ||
      a.name.localeCompare(b.name),
  );
}

/** The single item for the "Next up" card on the main screen. */
export function nextUp(states: readonly ItemState[]): ItemState | null {
  return sortByUrgency(states)[0] ?? null;
}
