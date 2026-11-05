import { describe, expect, it } from "vitest";
import {
  checkInterval,
  defaultItemsFor,
  displayName,
  genderSwitchPlan,
  kindsFor,
  taskName,
} from "../src/index.js";

describe("catalog", () => {
  it("lists the male items", () => {
    expect(kindsFor("male")).toEqual([
      "pubic_hair",
      "armpit_hair",
      "nails",
      "head_hair",
      "beard",
      "moustache",
    ]);
  });

  it("lists the female items", () => {
    expect(kindsFor("female")).toEqual([
      "pubic_hair",
      "armpit_hair",
      "nails",
      "head_hair",
      "body_hair",
      "facial_hair",
    ]);
  });

  it("defaults to 40 days, nails 7, with shorter notice for nails", () => {
    const items = defaultItemsFor("male");
    const by = Object.fromEntries(items.map((i) => [i.kind, i]));
    expect(by.pubic_hair!.intervalDays).toBe(40);
    expect(by.pubic_hair!.leadDays).toBe(3);
    expect(by.nails!.intervalDays).toBe(7);
    expect(by.nails!.leadDays).toBe(1);
    expect(by.moustache!.enabled).toBe(true);
    expect(items.every((i) => i.remindOnDue && i.remindOverdueDaily && i.enabled)).toBe(true);
  });

  it("beard defaults to trim and follows the user's choice", () => {
    expect(defaultItemsFor("male").find((i) => i.kind === "beard")!.variant).toBe("trim");
    const shave = defaultItemsFor("male", { beardVariant: "shave" }).find(
      (i) => i.kind === "beard",
    )!;
    expect(shave.variant).toBe("shave");
    expect(taskName("beard", "shave")).toBe("Beard shave");
    expect(taskName("beard", "trim")).toBe("Beard trim");
    expect(displayName("beard", "shave")).toBe("Beard (shave)");
    expect(defaultItemsFor("female").some((i) => i.variant !== null)).toBe(false);
  });

  it("gives a gentle note for fitrah items over 40 days in Islamic mode only", () => {
    expect(checkInterval("pubic_hair", 45, "islamic").note).toMatch(/40 days/);
    expect(checkInterval("pubic_hair", 45, "islamic").valid).toBe(true);
    expect(checkInterval("pubic_hair", 45, "default").note).toBeNull();
    expect(checkInterval("head_hair", 60, "islamic").note).toBeNull();
    expect(checkInterval("nails", 0, "default").valid).toBe(false);
    expect(checkInterval("nails", 2.5, "default").valid).toBe(false);
  });

  it("plans a gender switch without deleting anything", () => {
    const male = defaultItemsFor("male");
    const plan = genderSwitchPlan(male, "female");
    expect(plan.disable.sort()).toEqual(["beard", "moustache"]);
    expect(plan.create.sort()).toEqual(["body_hair", "facial_hair"]);
    expect(plan.enable).toEqual([]);

    const switchedBack = genderSwitchPlan(
      [...male.map((i) => ({ ...i, enabled: !["beard", "moustache"].includes(i.kind) }))],
      "male",
    );
    expect(switchedBack.enable.sort()).toEqual(["beard", "moustache"]);
    expect(switchedBack.create).toEqual([]);
  });
});
