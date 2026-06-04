import { describe, it, expect } from "vitest";
import { totalsByProduct } from "./aggregate";
import type { LogEntry } from "../data/types";

const mk = (product: string, sku: string, qty: number, type: LogEntry["activityType"]): LogEntry => ({
  entryId: product + sku + qty + type, activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Zone B", activityType: type, product, sku, quantity: qty, loggedAt: "x",
});

describe("totalsByProduct", () => {
  it("sums quantity per product across both activity types", () => {
    const rows = totalsByProduct([
      mk("CoolGuard (L)", "CG-L-15", 5, "Stock Take"),
      mk("CoolGuard (L)", "CG-L-15", 3, "Stock Top Up"),
      mk("CoolComfort (M)", "CC-M-15", 2, "Stock Take"),
    ]);
    expect(rows).toEqual([
      { product: "CoolComfort (M)", sku: "CC-M-15", total: 2 },
      { product: "CoolGuard (L)", sku: "CG-L-15", total: 8 },
    ]);
  });
  it("returns an empty array for no entries", () => {
    expect(totalsByProduct([])).toEqual([]);
  });
});
