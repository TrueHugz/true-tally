import { describe, it, expect, beforeEach } from "vitest";
import { loadPending, savePending, addPending, removePending } from "./pendingStore";
import type { PendingEntry } from "../data/types";

const mk = (id: string): PendingEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

describe("pendingStore", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty array when nothing is stored", () => {
    expect(loadPending()).toEqual([]);
  });
  it("adds and reloads entries", () => {
    addPending(mk("a"));
    addPending(mk("b"));
    expect(loadPending().map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("removes by entryId", () => {
    savePending([mk("a"), mk("b")]);
    expect(removePending("a").map((e) => e.entryId)).toEqual(["b"]);
    expect(loadPending().map((e) => e.entryId)).toEqual(["b"]);
  });
  it("recovers from corrupt JSON", () => {
    localStorage.setItem("truehugz.pendingEntries", "{not json");
    expect(loadPending()).toEqual([]);
  });
});
