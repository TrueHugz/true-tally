import { describe, it, expect } from "vitest";
import { validateEntry, type EntryDraft } from "./validate";

const valid: EntryDraft = {
  institution: "NUH Health & U", branch: "Zone B", activityType: "Stock Take",
  activityDate: "2026-06-05", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 5,
};

describe("validateEntry", () => {
  it("passes a complete draft", () => {
    expect(validateEntry(valid)).toEqual([]);
  });
  it("flags missing branch, product, activity type", () => {
    expect(validateEntry({ ...valid, branch: "", product: "", activityType: null })).toEqual([
      "Select a branch", "Choose Stock Take or Stock Top Up", "Select a product",
    ]);
  });
  it("rejects non-positive or non-integer quantity", () => {
    expect(validateEntry({ ...valid, quantity: 0 })).toContain("Quantity must be a whole number greater than 0");
    expect(validateEntry({ ...valid, quantity: 2.5 })).toContain("Quantity must be a whole number greater than 0");
    expect(validateEntry({ ...valid, quantity: null })).toContain("Quantity must be a whole number greater than 0");
  });
  it("rejects a malformed date", () => {
    expect(validateEntry({ ...valid, activityDate: "06/05/2026" })).toContain("Pick a valid date");
  });
});
