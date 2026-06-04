import { describe, it, expect } from "vitest";
import { mergeEntries } from "./merge";
import type { LogEntry } from "../data/types";

const mk = (id: string): LogEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

describe("mergeEntries", () => {
  it("appends pending entries not already on the server", () => {
    const merged = mergeEntries([mk("a")], [mk("b")]);
    expect(merged.map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("drops pending entries whose Entry ID is already on the server", () => {
    const merged = mergeEntries([mk("a"), mk("b")], [mk("b"), mk("c")]);
    expect(merged.map((e) => e.entryId)).toEqual(["a", "b", "c"]);
  });
});
