import { describe, it, expect } from "vitest";
import { todayISODate, monthPrefix } from "./dates";

describe("dates", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayISODate(new Date(2026, 5, 5))).toBe("2026-06-05");
  });
  it("zero-pads single-digit months and days", () => {
    expect(todayISODate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
  it("returns the YYYY-MM month prefix", () => {
    expect(monthPrefix("2026-06-05")).toBe("2026-06");
  });
});
