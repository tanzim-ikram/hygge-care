import { describe, expect, it } from "vitest";
import { lastDoneFromAnswer } from "../src/index.js";

describe("onboarding last-done answers", () => {
  const today = "2026-11-05";
  it("maps quick answers to dates", () => {
    expect(lastDoneFromAnswer({ kind: "today" }, today)).toBe(today);
    expect(lastDoneFromAnswer({ kind: "week_ago" }, today)).toBe("2026-10-29");
    expect(lastDoneFromAnswer({ kind: "two_weeks_ago" }, today)).toBe("2026-10-22");
    expect(lastDoneFromAnswer({ kind: "date", date: "2026-10-01" }, today)).toBe("2026-10-01");
    expect(lastDoneFromAnswer({ kind: "unknown" }, today)).toBeNull();
  });
  it("rejects future or invalid dates", () => {
    expect(() => lastDoneFromAnswer({ kind: "date", date: "2026-11-06" }, today)).toThrow();
    expect(() => lastDoneFromAnswer({ kind: "date", date: "2026-02-30" }, today)).toThrow();
  });
});
