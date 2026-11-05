import { describe, expect, it } from "vitest";
import {
  buildDigest,
  defaultItemsFor,
  digestMessage,
  type DigestInput,
  type DigestProfile,
  type ItemSettings,
} from "../src/index.js";

const profile: DigestProfile = {
  gender: "male",
  mode: "islamic",
  discreet: false,
  preferredWeekday: null,
  plansQurbani: false,
  qurbaniDay: 10,
  hijriOffset: 0,
  periodLeadDays: 2,
};

const items = defaultItemsFor("male");
const only = (kinds: string[], patch: Partial<ItemSettings> = {}): ItemSettings[] =>
  items.filter((i) => kinds.includes(i.kind)).map((i) => ({ ...i, ...patch }));

function digest(over: Partial<DigestInput>) {
  return buildDigest({ date: "2026-11-05", profile, items, logs: [], ...over });
}

describe("daily digest", () => {
  it("is null when nothing is due", () => {
    expect(digest({ logs: [{ itemId: "pubic_hair", doneOn: "2026-11-01" }] })).toBeNull();
    expect(digest({})).toBeNull();
  });

  it("reminds at the lead time, on the day and when overdue", () => {
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-10-01" }]; // due 2026-11-10
    const at = (date: string) =>
      buildDigest({ date, profile, items, logs })?.entries[0]?.type ?? null;
    expect(at("2026-11-06")).toBeNull();
    expect(at("2026-11-07")).toBe("due_soon");
    expect(at("2026-11-08")).toBeNull(); // no daily nagging while "due soon"
    expect(at("2026-11-10")).toBe("due_today");
    expect(at("2026-11-11")).toBe("overdue");
    expect(at("2026-11-17")).toBe("overdue"); // day 7
    expect(at("2026-11-18")).toBeNull(); // capped after 7 overdue days
  });

  it("uses gentle, explicit wording", () => {
    const d = buildDigest({
      date: "2026-11-07",
      profile,
      items,
      logs: [{ itemId: "pubic_hair", doneOn: "2026-10-01" }],
    })!;
    expect(d.title).toBe("Hygge");
    expect(d.body).toBe("Pubic hair removal in 3 days");
    expect(d.itemIds).toEqual(["pubic_hair"]);
    const late = buildDigest({
      date: "2026-11-12",
      profile,
      items,
      logs: [{ itemId: "pubic_hair", doneOn: "2026-10-01" }],
    })!;
    expect(late.body).toBe("Pubic hair removal: it's been 2 days past. Whenever you're ready");
  });

  it("combines several items into one message", () => {
    const d = digest({
      logs: [
        { itemId: "pubic_hair", doneOn: "2026-09-26" }, // due today
        { itemId: "armpit_hair", doneOn: "2026-09-26" }, // due today
        { itemId: "nails", doneOn: "2026-10-29" }, // due today (7 days)
      ],
    })!;
    expect(d.entries).toHaveLength(3);
    expect(d.title).toBe("Hygge · 3 gentle reminders");
    expect(d.body.split("\n")).toHaveLength(3);
    expect(d.itemIds.sort()).toEqual(["armpit_hair", "nails", "pubic_hair"]);
  });

  it("hides details in discreet mode", () => {
    const d = digest({ logs: [{ itemId: "pubic_hair", doneOn: "2026-09-26" }] })!;
    expect(digestMessage(d, true)).toEqual({
      title: "Hygge",
      body: "You have a gentle reminder. Open Hygge to see it.",
    });
    expect(digestMessage(d, false).body).toMatch(/Pubic hair/);
  });

  it("uses the beard variant in the wording", () => {
    const d = buildDigest({
      date: "2026-11-05",
      profile,
      items: only(["beard"], { variant: "shave" }),
      logs: [{ itemId: "beard", doneOn: "2026-09-26" }],
    })!;
    expect(d.body).toMatch(/^Beard shave/);
  });

  it("respects the per-item rules and disabled items", () => {
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-09-26" }]; // due today
    expect(digest({ items: only(["pubic_hair"], { remindOnDue: false }), logs })).toBeNull();
    expect(digest({ items: only(["pubic_hair"], { enabled: false }), logs })).toBeNull();
    const overdueLogs = [{ itemId: "pubic_hair", doneOn: "2026-09-20" }];
    expect(
      digest({ items: only(["pubic_hair"], { remindOverdueDaily: false }), logs: overdueLogs }),
    ).toBeNull();
  });

  it("snoozes, then reminds on the snooze date even between trigger days", () => {
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-10-01" }]; // due 11-10
    const snoozed = only(["pubic_hair"], { snoozedUntil: "2026-11-08" });
    expect(buildDigest({ date: "2026-11-07", profile, items: snoozed, logs })).toBeNull();
    expect(
      buildDigest({ date: "2026-11-08", profile, items: snoozed, logs })!.entries[0]!.type,
    ).toBe("due_soon");
  });

  it("nudges on the preferred day for items coming up", () => {
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-09-28" }]; // due 11-07, 1 day left on Fri 11-06
    const d = buildDigest({
      date: "2026-11-06",
      profile: { ...profile, preferredWeekday: 5 },
      items,
      logs,
    })!;
    expect(d.entries[0]!.type).toBe("preferred_day");
    expect(d.body).toBe("It's Friday, a good day for pubic hair removal");
    expect(d.itemIds).toEqual(["pubic_hair"]);
  });

  it("pauses during ihram and reminds when it ends", () => {
    const pauses = [{ id: "h", kind: "ihram" as const, start: "2026-11-03", end: "2026-11-08" }];
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-09-26" }]; // due 11-05
    expect(digest({ pauses, logs })).toBeNull();
    const after = buildDigest({ date: "2026-11-09", profile, items, logs, pauses })!;
    expect(after.entries.map((e) => e.type)).toEqual(["overdue", "pause_over"]);
    expect(after.body).toMatch(/ihram is over/);
  });

  it("ignores ihram pauses in Default mode but keeps custom pauses", () => {
    const logs = [{ itemId: "pubic_hair", doneOn: "2026-09-26" }];
    const def = { ...profile, mode: "default" as const };
    const ihram = [{ id: "h", kind: "ihram" as const, start: "2026-11-03", end: "2026-11-08" }];
    expect(
      buildDigest({ date: "2026-11-05", profile: def, items, logs, pauses: ihram }),
    ).not.toBeNull();
    const custom = [{ id: "c", kind: "custom" as const, start: "2026-11-03", end: "2026-11-08" }];
    expect(
      buildDigest({ date: "2026-11-05", profile: def, items, logs, pauses: custom }),
    ).toBeNull();
  });

  describe("Qurbani (1 Dhul Hijjah 1448 = 2027-05-07, 10th = 2027-05-16)", () => {
    const q = { ...profile, plansQurbani: true };
    it("alerts 3 days before Dhul Hijjah", () => {
      const d = buildDigest({ date: "2027-05-04", profile: q, items, logs: [] })!;
      expect(d.entries[0]!.type).toBe("dhul_hijjah_soon");
    });
    it("pauses grooming reminders during the first ten days", () => {
      const logs = [{ itemId: "pubic_hair", doneOn: "2027-03-30" }]; // due 05-09
      expect(buildDigest({ date: "2027-05-09", profile: q, items, logs })).toBeNull();
      expect(buildDigest({ date: "2027-05-09", profile, items, logs })!.entries[0]!.type).toBe(
        "due_today",
      );
    });
    it("says you can groom again after the sacrifice day", () => {
      const d = buildDigest({ date: "2027-05-17", profile: q, items, logs: [] })!;
      expect(d.entries.map((e) => e.type)).toEqual(["qurbani_over"]);
    });
    it("does nothing in Default mode", () => {
      const def = { ...q, mode: "default" as const };
      expect(buildDigest({ date: "2027-05-04", profile: def, items, logs: [] })).toBeNull();
    });
  });

  it("adds the period alert for female users", () => {
    const female = { ...profile, gender: "female" as const };
    const cycles = [{ start: "2026-10-12", end: "2026-10-16" }]; // next 11-09
    const d = buildDigest({
      date: "2026-11-07",
      profile: female,
      items: defaultItemsFor("female"),
      logs: [],
      cycles,
    })!;
    expect(d.body).toBe("Your period is expected in 2 days");
    expect(buildDigest({ date: "2026-11-07", profile, items, logs: [], cycles })).toBeNull();
  });
});
