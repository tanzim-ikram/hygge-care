import type { SupabaseClient } from "@supabase/supabase-js";
import type { BeardVariant, Gender, ItemKind, ItemSettings, Pause } from "@hygge/core";
import type { AppData, LogRow, NewLog, Profile, Store } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come straight from Postgres */

function profileFromRow(r: any, isGuest: boolean): Profile {
  return {
    displayName: r.display_name ?? "",
    gender: r.gender ?? null,
    mode: r.mode,
    themeMode: r.theme_mode,
    timezone: r.timezone,
    reminderHour: r.reminder_hour,
    quietStart: r.quiet_start,
    quietEnd: r.quiet_end,
    discreet: r.discreet,
    preferredWeekday: r.preferred_weekday ?? null,
    plansQurbani: r.plans_qurbani,
    qurbaniDay: r.qurbani_day,
    hijriOffset: r.hijri_offset,
    onboarded: r.onboarded,
    isGuest,
  };
}

const PROFILE_COLUMNS: Record<keyof Omit<Profile, "isGuest">, string> = {
  displayName: "display_name",
  gender: "gender",
  mode: "mode",
  themeMode: "theme_mode",
  timezone: "timezone",
  reminderHour: "reminder_hour",
  quietStart: "quiet_start",
  quietEnd: "quiet_end",
  discreet: "discreet",
  preferredWeekday: "preferred_weekday",
  plansQurbani: "plans_qurbani",
  qurbaniDay: "qurbani_day",
  hijriOffset: "hijri_offset",
  onboarded: "onboarded",
};

function itemFromRow(r: any): ItemSettings {
  return {
    id: r.id,
    kind: r.kind as ItemKind,
    variant: r.variant ?? null,
    intervalDays: r.interval_days,
    leadDays: r.lead_days,
    remindOnDue: r.remind_on_due,
    remindOverdueDaily: r.remind_overdue_daily,
    snoozedUntil: r.snoozed_until ?? null,
    enabled: r.enabled,
  };
}

const ITEM_COLUMNS: Record<string, string> = {
  variant: "variant",
  intervalDays: "interval_days",
  leadDays: "lead_days",
  remindOnDue: "remind_on_due",
  remindOverdueDaily: "remind_overdue_daily",
  snoozedUntil: "snoozed_until",
  enabled: "enabled",
};

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Supabase storage. Signs in anonymously first, so "try without an account" just works. */
export class CloudStore implements Store {
  readonly kind = "cloud" as const;
  private userId: string | null = null;
  private isGuest = true;

  constructor(private readonly sb: SupabaseClient) {}

  private async ensureUser(): Promise<string> {
    if (this.userId) return this.userId;
    let { data } = await this.sb.auth.getSession();
    if (!data.session) {
      const res = await this.sb.auth.signInAnonymously();
      fail(res.error);
      data = { session: res.data.session };
    }
    const user = data.session?.user;
    if (!user) throw new Error("Could not start a session");
    this.userId = user.id;
    this.isGuest = user.is_anonymous ?? false;
    return user.id;
  }

  async load(): Promise<AppData> {
    const uid = await this.ensureUser();
    const [profile, items, logs, pauses, cycles] = await Promise.all([
      this.sb.from("profiles").select("*").eq("id", uid).single(),
      this.sb.from("tracker_items").select("*").eq("user_id", uid),
      this.sb.from("grooming_logs").select("id,item_id,done_on").eq("user_id", uid),
      this.sb.from("pauses").select("*").eq("user_id", uid),
      this.sb.from("cycles").select("*").eq("user_id", uid),
    ]);
    for (const r of [profile, items, logs, pauses, cycles]) fail(r.error);
    return {
      profile: profileFromRow(profile.data, this.isGuest),
      items: (items.data ?? []).map(itemFromRow),
      logs: (logs.data ?? []).map((l: any) => ({ id: l.id, itemId: l.item_id, doneOn: l.done_on })),
      pauses: (pauses.data ?? []).map((p: any): Pause => ({
        id: p.id,
        kind: p.kind,
        start: p.start_date,
        end: p.end_date,
      })),
      cycles: (cycles.data ?? []).map((c: any) => ({
        start: c.start_date,
        end: c.end_date ?? null,
      })),
    };
  }

  async saveProfile(patch: Partial<Profile>): Promise<void> {
    const uid = await this.ensureUser();
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      const col = PROFILE_COLUMNS[key as keyof typeof PROFILE_COLUMNS];
      if (col) row[col] = value;
    }
    if (!Object.keys(row).length) return;
    fail((await this.sb.from("profiles").update(row).eq("id", uid)).error);
  }

  async applyGender(gender: Gender, beard: BeardVariant): Promise<void> {
    await this.ensureUser();
    fail((await this.sb.rpc("apply_gender", { p_gender: gender, p_beard: beard })).error);
    // apply_gender only sets the beard on creation; honour a changed choice too.
    const uid = await this.ensureUser();
    if (gender === "male") {
      fail(
        (
          await this.sb
            .from("tracker_items")
            .update({ variant: beard })
            .eq("user_id", uid)
            .eq("kind", "beard")
        ).error,
      );
    }
  }

  async updateItem(id: string, patch: Partial<Omit<ItemSettings, "id" | "kind">>): Promise<void> {
    await this.ensureUser();
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      const col = ITEM_COLUMNS[key];
      if (col) row[col] = value;
    }
    if (!Object.keys(row).length) return;
    fail((await this.sb.from("tracker_items").update(row).eq("id", id)).error);
  }

  async addLogs(logs: NewLog[]): Promise<LogRow[]> {
    const uid = await this.ensureUser();
    if (!logs.length) return [];
    const { data, error } = await this.sb
      .from("grooming_logs")
      .insert(logs.map((l) => ({ user_id: uid, item_id: l.itemId, done_on: l.doneOn })))
      .select("id,item_id,done_on");
    fail(error);
    return (data ?? []).map((l: any) => ({ id: l.id, itemId: l.item_id, doneOn: l.done_on }));
  }

  async removeLogs(ids: string[]): Promise<void> {
    await this.ensureUser();
    if (!ids.length) return;
    fail((await this.sb.from("grooming_logs").delete().in("id", ids)).error);
  }

  async deleteEverything(): Promise<void> {
    await this.ensureUser();
    fail((await this.sb.rpc("delete_my_account")).error);
    await this.sb.auth.signOut();
    this.userId = null;
  }
}
