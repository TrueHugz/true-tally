import { describe, it, expect } from "vitest";
import { branchExists, productExists } from "./catalog";

const branches = [{ institution: "NUH Health & U", branch: "Zone B", remarks: "" }];
const products = [{ description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" }];

describe("catalog dedup", () => {
  it("detects an existing branch (case-insensitive, per institution)", () => {
    expect(branchExists(branches, "NUH Health & U", " zone b ")).toBe(true);
    expect(branchExists(branches, "Other Hospital", "Zone B")).toBe(false);
  });
  it("detects an existing product by SKU (case-insensitive)", () => {
    expect(productExists(products, "cg-l-15")).toBe(true);
    expect(productExists(products, "NEW-1")).toBe(false);
  });
});
