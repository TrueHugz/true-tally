import { describe, it, expect } from "vitest";
import { filterByWindow } from "./filter";
import type { LogEntry } from "../data/types";

const mk = (id: string, date: string): LogEntry => ({
  entryId: id, activityDate: date, institution: "NUH Health & U",
  branch: "Zone B", activityType: "Stock Take", product: "P", sku: "S",
  quantity: 1, loggedAt: "2026-06-05T00:00:00.000Z",
});
const today = "2026-06-05";
const entries = [mk("a", "2026-06-05"), mk("b", "2026-06-20"), mk("c", "2026-05-31"), mk("d", "2025-06-05")];

describe("filterByWindow", () => {
  it("day keeps only today's entries", () => {
    expect(filterByWindow(entries, "day", today).map((e) => e.entryId)).toEqual(["a"]);
  });
  it("month keeps the current calendar month", () => {
    expect(filterByWindow(entries, "month", today).map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("toDate keeps everything", () => {
    expect(filterByWindow(entries, "toDate", today)).toHaveLength(4);
  });
});
