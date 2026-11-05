import { describe, expect, it } from "vitest";
import { cycleStats, predictCycle } from "../src/index.js";

describe("cycle", () => {
  it("uses defaults with a single logged period", () => {
    const p = predictCycle([{ start: "2026-10-20", end: null }], "2026-11-05")!;
    expect(p.stats.usingDefaults).toBe(true);
    expect(p.nextStart).toBe("2026-11-17"); // +28
    expect(p.nextEnd).toBe("2026-11-21"); // 5 days
    expect(p.ovulation).toBe("2026-11-03");
    expect(p.fertileStart).toBe("2026-10-29");
    expect(p.fertileEnd).toBe("2026-11-04");
    expect(p.daysUntil).toBe(12);
    expect(p.cycleDay).toBe(17);
    expect(p.onPeriod).toBe(false);
  });

  it("averages real cycles (hand-checked)", () => {
    const cycles = [
      { start: "2026-08-01", end: "2026-08-05" },
      { start: "2026-08-31", end: "2026-09-05" }, // 30 days, 6-day period
      { start: "2026-09-28", end: "2026-10-01" }, // 28 days, 4-day period
      { start: "2026-10-27", end: null }, // 29 days, ongoing
    ];
    const s = cycleStats(cycles);
    expect(s.cycleLengths).toEqual([30, 28, 29]);
    expect(s.avgCycleLength).toBe(29);
    expect(s.periodLengths).toEqual([5, 6, 4]);
    expect(s.avgPeriodLength).toBe(5);
    expect(s.stdDev).toBe(0.8);
    expect(s.regular).toBe(true);
    const p = predictCycle(cycles, "2026-10-29")!;
    expect(p.onPeriod).toBe(true);
    expect(p.nextStart).toBe("2026-11-25");
  });

  it("ignores impossible gaps, sorts input and flags irregular cycles", () => {
    const s = cycleStats([
      { start: "2026-06-25", end: null },
      { start: "2026-01-01", end: null },
      { start: "2026-04-15", end: null }, // 5 days after 04-10: ignored
      { start: "2026-05-05", end: null }, // 20
      { start: "2026-06-05", end: null }, // 31
      { start: "2026-04-10", end: null }, // 99 days after 01-01: ignored
    ]);
    expect(s.cycleLengths).toEqual([20, 31, 20]);
    expect(s.regular).toBe(false);
  });

  it("keeps only the last 6 cycles", () => {
    const starts = ["2026-01-01"];
    const lens = [40, 40, 40, 28, 28, 28, 28, 28, 28];
    for (const l of lens) {
      const prev = new Date(starts[starts.length - 1]! + "T00:00:00Z");
      starts.push(new Date(prev.getTime() + l * 86400000).toISOString().slice(0, 10));
    }
    const s = cycleStats(starts.map((start) => ({ start, end: null })));
    expect(s.cycleLengths).toHaveLength(6);
    expect(s.avgCycleLength).toBe(28);
  });

  it("reports a late period as negative days", () => {
    const p = predictCycle([{ start: "2026-10-01", end: "2026-10-05" }], "2026-11-01")!;
    expect(p.daysUntil).toBe(-3);
  });

  it("returns null with no data or only future data", () => {
    expect(predictCycle([], "2026-11-05")).toBeNull();
    expect(predictCycle([{ start: "2026-12-01", end: null }], "2026-11-05")).toBeNull();
  });
});
