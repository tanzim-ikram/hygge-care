import { describe, expect, it } from "vitest";
import { effectiveSendHour, isQuietHour, isSendHour } from "../src/index.js";

describe("quiet hours", () => {
  it("handles overnight ranges", () => {
    expect(isQuietHour(23, 22, 7)).toBe(true);
    expect(isQuietHour(3, 22, 7)).toBe(true);
    expect(isQuietHour(7, 22, 7)).toBe(false);
    expect(isQuietHour(9, 22, 7)).toBe(false);
    expect(isQuietHour(13, 12, 14)).toBe(true);
    expect(isQuietHour(3, 0, 0)).toBe(false);
  });

  it("moves a reminder out of quiet hours", () => {
    expect(effectiveSendHour({ reminderHour: 9, quietStart: 22, quietEnd: 7 })).toBe(9);
    expect(effectiveSendHour({ reminderHour: 5, quietStart: 22, quietEnd: 7 })).toBe(7);
  });

  it("knows when the hourly job should send", () => {
    const w = { timezone: "Asia/Dhaka", reminderHour: 9, quietStart: 22, quietEnd: 7 };
    expect(isSendHour(w, new Date("2026-11-05T03:15:00Z"))).toBe(true); // 09:15 Dhaka
    expect(isSendHour(w, new Date("2026-11-05T04:15:00Z"))).toBe(false);
  });
});
