import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  hourIn,
  isLocalDate,
  isValidTimeZone,
  maxDate,
  plural,
  todayIn,
  weekday,
} from "../src/index.js";

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-13-01")).toBe(false);
    expect(isLocalDate("2026-1-01")).toBe(false);
    expect(isLocalDate(20260101)).toBe(false);
  });

  it("adds days across month, year and leap-year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-05", 40)).toBe("2026-12-15");
  });

  it("is not affected by DST changes", () => {
    // Europe and the US change clocks on these dates; plain dates must not drift.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(diffDays("2026-11-02", "2026-10-31")).toBe(2);
  });

  it("diffs days", () => {
    expect(diffDays("2026-12-15", "2026-11-05")).toBe(40);
    expect(diffDays("2026-11-05", "2026-12-15")).toBe(-40);
  });

  it("finds weekdays", () => {
    expect(weekday("2026-11-06")).toBe(5); // Friday
    expect(weekday("2026-11-08")).toBe(0); // Sunday
  });

  it("works out today and the hour in a time zone", () => {
    const now = new Date("2026-11-04T20:30:00Z");
    expect(todayIn("Asia/Dhaka", now)).toBe("2026-11-05"); // UTC+6
    expect(todayIn("America/New_York", now)).toBe("2026-11-04");
    expect(hourIn("Asia/Dhaka", now)).toBe(2);
    expect(hourIn("UTC", new Date("2026-11-04T00:10:00Z"))).toBe(0);
  });

  it("checks time zones", () => {
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });

  it("helpers", () => {
    expect(maxDate([])).toBeNull();
    expect(maxDate(["2026-01-02", "2026-03-01", "2025-12-31"])).toBe("2026-03-01");
    expect(plural(1, "day")).toBe("1 day");
    expect(plural(3, "day")).toBe("3 days");
  });
});
