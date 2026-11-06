import { describe, expect, it } from "vitest";
import { addLogs, applyGender, emptyData, removeLogs, updateItem } from "../src/lib/store/ops";
import { LocalStore } from "../src/lib/store/local";

describe("store operations", () => {
  it("creates the male items with a chosen beard variant", () => {
    const d = applyGender(emptyData("Asia/Dhaka"), "male", "shave");
    expect(d.profile.gender).toBe("male");
    expect(d.items.map((i) => i.kind)).toEqual([
      "pubic_hair",
      "armpit_hair",
      "nails",
      "head_hair",
      "beard",
      "moustache",
    ]);
    expect(d.items.find((i) => i.kind === "beard")!.variant).toBe("shave");
    expect(d.items.find((i) => i.kind === "nails")!.intervalDays).toBe(7);
    expect(d.items.every((i) => i.enabled)).toBe(true);
  });

  it("switches gender without deleting items, and restores them on switching back", () => {
    let d = applyGender(emptyData(), "male", "trim");
    d = applyGender(d, "female", "trim");
    const byKind = Object.fromEntries(d.items.map((i) => [i.kind, i.enabled]));
    expect(byKind.beard).toBe(false);
    expect(byKind.moustache).toBe(false);
    expect(byKind.body_hair).toBe(true);
    expect(byKind.facial_hair).toBe(true);
    expect(d.items).toHaveLength(8);
    d = applyGender(d, "male", "trim");
    expect(d.items.find((i) => i.kind === "beard")!.enabled).toBe(true);
    expect(d.items.find((i) => i.kind === "body_hair")!.enabled).toBe(false);
  });

  it("keeps edited intervals when the gender is re-applied", () => {
    let d = applyGender(emptyData(), "male", "trim");
    d = updateItem(d, "pubic_hair", { intervalDays: 30 });
    d = applyGender(d, "male", "trim");
    expect(d.items.find((i) => i.kind === "pubic_hair")!.intervalDays).toBe(30);
  });

  it("adds and removes logs, ignoring unknown items", () => {
    let d = applyGender(emptyData(), "female", "trim");
    const { data, rows } = addLogs(d, [
      { itemId: "nails", doneOn: "2026-11-01" },
      { itemId: "beard", doneOn: "2026-11-01" }, // not a female item
      { itemId: "missing", doneOn: "2026-11-01" },
    ]);
    d = data;
    expect(rows.map((r) => r.itemId)).toEqual(["nails"]);
    expect(d.logs).toHaveLength(1);
    d = removeLogs(d, [rows[0]!.id]);
    expect(d.logs).toHaveLength(0);
  });
});

describe("LocalStore", () => {
  it("works without localStorage (falls back to memory)", async () => {
    const s = new LocalStore();
    const first = await s.load();
    expect(first.profile.onboarded).toBe(false);
    expect(first.profile.isGuest).toBe(true);
    await s.saveProfile({ displayName: "T", onboarded: true });
    await s.applyGender("male", "trim");
    const [log] = await s.addLogs([{ itemId: "nails", doneOn: "2026-11-05" }]);
    const again = await s.load();
    expect(again.profile.displayName).toBe("T");
    expect(again.logs).toHaveLength(1);
    await s.removeLogs([log!.id]);
    expect((await s.load()).logs).toHaveLength(0);
    await s.deleteEverything();
    expect((await s.load()).profile.onboarded).toBe(false);
  });
});
