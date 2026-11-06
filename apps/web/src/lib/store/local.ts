import type { BeardVariant, Gender } from "@hygge/core";
import * as ops from "./ops";
import type { AppData, LogRow, NewLog, Profile, Store } from "./types";
import type { ItemSettings } from "@hygge/core";

const KEY = "hygge:v1";

function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Browser-only storage. Works with no account and no keys. */
export class LocalStore implements Store {
  readonly kind = "local" as const;
  private data: AppData | null = null;

  private read(): AppData {
    if (this.data) return this.data;
    let parsed: AppData | null = null;
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      if (raw) parsed = JSON.parse(raw) as AppData;
    } catch {
      parsed = null; // storage blocked or corrupt: start fresh, never crash
    }
    this.data = parsed ?? ops.emptyData(detectTimeZone());
    this.data.profile.isGuest = true;
    return this.data;
  }

  private write(next: AppData): void {
    this.data = next;
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }

  async load(): Promise<AppData> {
    return structuredClone(this.read());
  }
  async saveProfile(patch: Partial<Profile>): Promise<void> {
    const d = this.read();
    this.write({ ...d, profile: { ...d.profile, ...patch } });
  }
  async applyGender(gender: Gender, beard: BeardVariant): Promise<void> {
    this.write(ops.applyGender(this.read(), gender, beard));
  }
  async updateItem(id: string, patch: Partial<Omit<ItemSettings, "id" | "kind">>): Promise<void> {
    this.write(ops.updateItem(this.read(), id, patch));
  }
  async addLogs(logs: NewLog[]): Promise<LogRow[]> {
    const { data, rows } = ops.addLogs(this.read(), logs);
    this.write(data);
    return rows;
  }
  async removeLogs(ids: string[]): Promise<void> {
    this.write(ops.removeLogs(this.read(), ids));
  }
  async deleteEverything(): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* ignore */
    }
    this.data = null;
  }
}
