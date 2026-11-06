import type {
  AppMode,
  BeardVariant,
  Cycle,
  Gender,
  GroomingLog,
  ItemSettings,
  LocalDate,
  Pause,
} from "@hygge/core";

export type ThemeMode = "day" | "night" | "system";

export interface Profile {
  displayName: string;
  gender: Gender | null;
  mode: AppMode;
  themeMode: ThemeMode;
  timezone: string;
  /** 0–23 */
  reminderHour: number;
  quietStart: number;
  quietEnd: number;
  discreet: boolean;
  /** 0 = Sunday … 6 = Saturday; null = none */
  preferredWeekday: number | null;
  plansQurbani: boolean;
  qurbaniDay: number;
  hijriOffset: number;
  onboarded: boolean;
  /** True for a guest (no linked account). Always true in local mode. */
  isGuest: boolean;
}

export interface LogRow extends GroomingLog {
  id: string;
}

export interface AppData {
  profile: Profile;
  items: ItemSettings[];
  logs: LogRow[];
  pauses: Pause[];
  cycles: Cycle[];
}

export interface NewLog {
  itemId: string;
  doneOn: LocalDate;
}

/**
 * Everything the UI needs from storage. Two implementations: the browser (local mode, no
 * account) and Supabase (cloud sync). The UI never knows which one it is talking to.
 */
export interface Store {
  readonly kind: "local" | "cloud";
  load(): Promise<AppData>;
  saveProfile(patch: Partial<Profile>): Promise<void>;
  /** Sets gender, creating or switching items. Nothing is ever deleted. */
  applyGender(gender: Gender, beard: BeardVariant): Promise<void>;
  updateItem(id: string, patch: Partial<Omit<ItemSettings, "id" | "kind">>): Promise<void>;
  addLogs(logs: NewLog[]): Promise<LogRow[]>;
  removeLogs(ids: string[]): Promise<void>;
  /** Local mode: wipes the browser data. Cloud mode: deletes the account. */
  deleteEverything(): Promise<void>;
}
