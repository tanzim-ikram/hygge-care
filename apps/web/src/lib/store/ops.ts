/**
 * Pure state transitions on AppData. The local store is just these plus localStorage,
 * which keeps all the logic testable without a browser.
 */
import {
  addDays,
  defaultItemsFor,
  genderSwitchPlan,
  kindsFor,
  type BeardVariant,
  type Gender,
  type ItemSettings,
} from "@hygge/core";
import type { AppData, LogRow, NewLog, Profile } from "./types";

export function defaultProfile(timezone = "UTC"): Profile {
  return {
    displayName: "",
    gender: null,
    mode: "islamic",
    themeMode: "system",
    timezone,
    reminderHour: 9,
    quietStart: 22,
    quietEnd: 7,
    discreet: false,
    preferredWeekday: null,
    plansQurbani: false,
    qurbaniDay: 10,
    hijriOffset: 0,
    onboarded: false,
    isGuest: true,
  };
}

export function emptyData(timezone = "UTC"): AppData {
  return { profile: defaultProfile(timezone), items: [], logs: [], pauses: [], cycles: [] };
}

export function applyGender(data: AppData, gender: Gender, beard: BeardVariant): AppData {
  const plan = genderSwitchPlan(data.items, gender);
  const defaults = defaultItemsFor(gender, { beardVariant: beard });
  const items: ItemSettings[] = data.items.map((i) => {
    if (plan.enable.includes(i.kind)) return { ...i, enabled: true };
    if (plan.disable.includes(i.kind)) return { ...i, enabled: false };
    return i;
  });
  for (const kind of plan.create) {
    const d = defaults.find((x) => x.kind === kind);
    if (d) items.push(d);
  }
  // The beard choice applies whenever the user picks it.
  const withBeard = items.map((i) => (i.kind === "beard" ? { ...i, variant: beard } : i));
  return { ...data, items: withBeard, profile: { ...data.profile, gender } };
}

export function updateItem(
  data: AppData,
  id: string,
  patch: Partial<Omit<ItemSettings, "id" | "kind">>,
): AppData {
  return { ...data, items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
}

let counter = 0;
export function newId(prefix = "log"): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${counter}`;
  return `${prefix}_${rand}`;
}

export function addLogs(data: AppData, logs: NewLog[]): { data: AppData; rows: LogRow[] } {
  const known = new Set(data.items.map((i) => i.id));
  const rows = logs.filter((l) => known.has(l.itemId)).map((l) => ({ ...l, id: newId() }));
  return { data: { ...data, logs: [...data.logs, ...rows] }, rows };
}

export function removeLogs(data: AppData, ids: string[]): AppData {
  const drop = new Set(ids);
  return { ...data, logs: data.logs.filter((l) => !drop.has(l.id)) };
}

/** Item kinds that should exist for a gender; used to sanity-check stored data. */
export function expectedKinds(gender: Gender) {
  return kindsFor(gender);
}

/** The day after `date`; used for "Tomorrow" (snooze). */
export function addOneDay(date: string): string {
  return addDays(date, 1);
}
