export type Gender = "male" | "female";
export type AppMode = "islamic" | "default";
export type BeardVariant = "shave" | "trim";

export type ItemKind =
  | "pubic_hair"
  | "armpit_hair"
  | "nails"
  | "head_hair"
  | "beard"
  | "moustache"
  | "body_hair"
  | "facial_hair";

export interface CatalogEntry {
  kind: ItemKind;
  /** Short name shown in lists. */
  name: string;
  genders: readonly Gender[];
  defaultIntervalDays: number;
  /** One of the fitrah acts with the 40-day limit (Sahih Muslim 258). */
  fitrah: boolean;
  emoji: string;
}

/** The sunnah upper limit for fitrah items, in days. */
export const FITRAH_MAX_DAYS = 40;
export const DEFAULT_INTERVAL_DAYS = 40;
export const OVERDUE_REMINDER_CAP_DAYS = 7;

export const CATALOG: readonly CatalogEntry[] = [
  {
    kind: "pubic_hair",
    name: "Pubic hair",
    genders: ["male", "female"],
    defaultIntervalDays: 40,
    fitrah: true,
    emoji: "🌿",
  },
  {
    kind: "armpit_hair",
    name: "Armpits",
    genders: ["male", "female"],
    defaultIntervalDays: 40,
    fitrah: true,
    emoji: "💧",
  },
  {
    kind: "nails",
    name: "Nails",
    genders: ["male", "female"],
    defaultIntervalDays: 7,
    fitrah: true,
    emoji: "💅",
  },
  {
    kind: "head_hair",
    name: "Head hair",
    genders: ["male", "female"],
    defaultIntervalDays: 40,
    fitrah: false,
    emoji: "💇",
  },
  {
    kind: "beard",
    name: "Beard",
    genders: ["male"],
    defaultIntervalDays: 40,
    fitrah: false,
    emoji: "🧔",
  },
  {
    kind: "moustache",
    name: "Moustache",
    genders: ["male"],
    defaultIntervalDays: 40,
    fitrah: true,
    emoji: "👨",
  },
  {
    kind: "body_hair",
    name: "Body hair",
    genders: ["female"],
    defaultIntervalDays: 40,
    fitrah: false,
    emoji: "✨",
  },
  {
    kind: "facial_hair",
    name: "Facial hair",
    genders: ["female"],
    defaultIntervalDays: 40,
    fitrah: false,
    emoji: "🌸",
  },
];

export function catalogEntry(kind: ItemKind): CatalogEntry {
  const entry = CATALOG.find((e) => e.kind === kind);
  if (!entry) throw new RangeError(`Unknown item kind: ${kind}`);
  return entry;
}

export function kindsFor(gender: Gender): ItemKind[] {
  return CATALOG.filter((e) => e.genders.includes(gender)).map((e) => e.kind);
}

/** The phrase used in reminders, e.g. "Pubic hair removal" or "Beard shave". */
export function taskName(kind: ItemKind, variant?: BeardVariant | null): string {
  switch (kind) {
    case "pubic_hair":
      return "Pubic hair removal";
    case "armpit_hair":
      return "Armpit hair removal";
    case "nails":
      return "Nail clipping";
    case "head_hair":
      return "Haircut";
    case "beard":
      return variant === "shave" ? "Beard shave" : "Beard trim";
    case "moustache":
      return "Moustache trim";
    case "body_hair":
      return "Body hair removal";
    case "facial_hair":
      return "Facial hair removal";
  }
}

/** Display name, e.g. "Beard (trim)". */
export function displayName(kind: ItemKind, variant?: BeardVariant | null): string {
  if (kind === "beard") return variant === "shave" ? "Beard (shave)" : "Beard (trim)";
  if (kind === "moustache") return "Moustache (trim)";
  return catalogEntry(kind).name;
}

/** Shorter reminders for short intervals: nails (7 days) get 1 day of notice. */
export function defaultLeadDays(intervalDays: number): number {
  return intervalDays >= 21 ? 3 : 1;
}

export interface ItemSettings {
  id: string;
  kind: ItemKind;
  variant: BeardVariant | null;
  intervalDays: number;
  leadDays: number;
  remindOnDue: boolean;
  remindOverdueDaily: boolean;
  /** When set, reminders for this item wait until this date. */
  snoozedUntil: string | null;
  enabled: boolean;
}

export function defaultItemsFor(
  gender: Gender,
  options: { beardVariant?: BeardVariant; idPrefix?: string } = {},
): ItemSettings[] {
  const prefix = options.idPrefix ?? "";
  return kindsFor(gender).map((kind) => {
    const intervalDays = catalogEntry(kind).defaultIntervalDays;
    return {
      id: `${prefix}${kind}`,
      kind,
      variant: kind === "beard" ? (options.beardVariant ?? "trim") : null,
      intervalDays,
      leadDays: defaultLeadDays(intervalDays),
      remindOnDue: true,
      remindOverdueDaily: true,
      snoozedUntil: null,
      enabled: true,
    };
  });
}

export interface IntervalCheck {
  valid: boolean;
  /** A gentle note, not an error: shown when a fitrah item exceeds 40 days in Islamic mode. */
  note: string | null;
  error: string | null;
}

export function checkInterval(kind: ItemKind, intervalDays: number, mode: AppMode): IntervalCheck {
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365) {
    return { valid: false, note: null, error: "Choose between 1 and 365 days." };
  }
  if (mode === "islamic" && catalogEntry(kind).fitrah && intervalDays > FITRAH_MAX_DAYS) {
    return {
      valid: true,
      error: null,
      note: "Gentle note: the sunnah is not to leave this longer than 40 days.",
    };
  }
  return { valid: true, note: null, error: null };
}

/**
 * Items to turn on/off when the user changes gender. Items are never deleted, so
 * history survives switching back.
 */
export function genderSwitchPlan(
  existing: readonly Pick<ItemSettings, "kind" | "enabled">[],
  newGender: Gender,
): { enable: ItemKind[]; disable: ItemKind[]; create: ItemKind[] } {
  const wanted = new Set(kindsFor(newGender));
  const have = new Set(existing.map((i) => i.kind));
  return {
    enable: existing.filter((i) => wanted.has(i.kind) && !i.enabled).map((i) => i.kind),
    disable: existing.filter((i) => !wanted.has(i.kind) && i.enabled).map((i) => i.kind),
    create: [...wanted].filter((k) => !have.has(k)),
  };
}
