import { describe, expect, it } from "vitest";
import {
  defaultItemsFor,
  getItemState,
  getItemStates,
  lastDoneFor,
  nextUp,
  rowSubtitle,
  sortByUrgency,
  statusHeadline,
  type ItemSettings,
} from "../src/index.js";

const items = defaultItemsFor("male");
const pubic = items.find((i) => i.kind === "pubic_hair")!;
const nails = items.find((i) => i.kind === "nails")!;

describe("item status", () => {
  it("is not started without a log", () => {
    const s = getItemState(pubic, null, "2026-11-05");
    expect(s.status).toBe("not_started");
    expect(s.dueDate).toBeNull();
    expect(statusHeadline(s)).toBe("Log it next time you do it");
  });

  it("walks through ok → due soon → due today → overdue", () => {
    const last = "2026-11-01"; // due 2026-12-11
    expect(getItemState(pubic, last, "2026-11-05").status).toBe("ok");
    expect(getItemState(pubic, last, "2026-12-07").status).toBe("ok");
    expect(getItemState(pubic, last, "2026-12-08").status).toBe("due_soon");
    expect(getItemState(pubic, last, "2026-12-10").status).toBe("due_soon");
    expect(getItemState(pubic, last, "2026-12-11").status).toBe("due_today");
    expect(getItemState(pubic, last, "2026-12-12").status).toBe("overdue");
  });

  it("reports days left, progress and gentle wording", () => {
    const s = getItemState(pubic, "2026-11-01", "2026-11-29");
    expect(s.dueDate).toBe("2026-12-11");
    expect(s.daysLeft).toBe(12);
    expect(s.progress).toBeCloseTo(0.7);
    expect(rowSubtitle(s)).toBe("12 days left");
    expect(statusHeadline(s)).toBe("You're on track 🌿");

    const late = getItemState(pubic, "2026-11-01", "2026-12-13");
    expect(rowSubtitle(late)).toBe("2 days past");
    expect(late.progress).toBe(1);
    expect(statusHeadline(late)).not.toMatch(/overdue/i);
  });

  it("shows paused during ihram and the Qurbani window", () => {
    const pauses = [{ id: "p", kind: "ihram" as const, start: "2027-05-10", end: "2027-05-20" }];
    const s = getItemState(pubic, "2027-04-01", "2027-05-15", { pauses });
    expect(s.status).toBe("paused");
    expect(rowSubtitle(s)).toBe("Paused during ihram");
    const q = getItemState(pubic, "2027-04-01", "2027-05-08", {
      qurbani: { start: "2027-05-07", end: "2027-05-16" },
    });
    expect(q.pausedBy).toBe("qurbani");
  });

  it("uses the latest log, including back-dated and same-day duplicates", () => {
    const logs = [
      { itemId: pubic.id, doneOn: "2026-10-01" },
      { itemId: pubic.id, doneOn: "2026-11-01" },
      { itemId: pubic.id, doneOn: "2026-11-01" },
      { itemId: pubic.id, doneOn: "2026-10-15" },
      { itemId: nails.id, doneOn: "2026-11-04" },
    ];
    expect(lastDoneFor(logs, pubic.id)).toBe("2026-11-01");
    expect(lastDoneFor(logs, "missing")).toBeNull();
  });

  it("skips disabled items and sorts by urgency", () => {
    const disabled: ItemSettings[] = items.map((i) =>
      i.kind === "head_hair" ? { ...i, enabled: false } : i,
    );
    const logs = [
      { itemId: pubic.id, doneOn: "2026-09-20" }, // overdue on 2026-11-05
      { itemId: nails.id, doneOn: "2026-11-01" }, // due 11-08, 3 left
      { itemId: "armpit_hair", doneOn: "2026-10-01" }, // due 11-10, 5 left
    ];
    const states = getItemStates(disabled, logs, "2026-11-05");
    expect(states.some((s) => s.item.kind === "head_hair")).toBe(false);
    const order = sortByUrgency(states).map((s) => s.item.kind);
    expect(order.slice(0, 3)).toEqual(["pubic_hair", "nails", "armpit_hair"]);
    expect(nextUp(states)!.item.kind).toBe("pubic_hair");
    expect(nextUp([])).toBeNull();
  });
});
