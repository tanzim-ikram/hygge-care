import { describe, expect, it } from "vitest";
import { findNextHijriDate, formatHijri, qurbaniWindow, toHijri } from "../src/index.js";

describe("hijri", () => {
  it("converts with the Umm al-Qura calendar", () => {
    expect(toHijri("2026-05-18")).toEqual({ year: 1447, month: 12, day: 1 });
    expect(toHijri("2026-05-27")).toEqual({ year: 1447, month: 12, day: 10 });
    expect(formatHijri("2026-05-27")).toBe("10 Dhul Hijjah 1447 AH");
  });

  it("applies the local moon-sighting offset", () => {
    expect(toHijri("2026-05-18", -1)).toEqual({ year: 1447, month: 11, day: 30 });
    expect(toHijri("2026-05-19", -1)).toEqual({ year: 1447, month: 12, day: 1 });
  });

  it("finds the next 1 Dhul Hijjah", () => {
    expect(findNextHijriDate(12, 1, "2026-11-05")).toBe("2027-05-07");
  });

  it("returns the upcoming Qurbani window", () => {
    expect(qurbaniWindow("2026-11-05")).toEqual({ start: "2027-05-07", end: "2027-05-16" });
  });

  it("returns the current window while inside it, and next year's after it", () => {
    expect(qurbaniWindow("2026-05-20")).toEqual({ start: "2026-05-18", end: "2026-05-27" });
    expect(qurbaniWindow("2026-05-27")!.end).toBe("2026-05-27");
    expect(qurbaniWindow("2026-05-28")!.start).toBe("2027-05-07");
  });

  it("supports a later sacrifice day", () => {
    expect(qurbaniWindow("2026-05-20", 0, 12)).toEqual({ start: "2026-05-18", end: "2026-05-29" });
  });
});
