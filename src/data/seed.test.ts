import { describe, it, expect } from "vitest";
import { SEED } from "./seed";

describe("seed", () => {
  it("has the NUH institution", () => {
    expect(SEED.institutions).toHaveLength(1);
    expect(SEED.institutions[0].institution).toBe("NUH Health & U");
  });
  it("has the 3 NUH branches", () => {
    expect(SEED.branches).toHaveLength(3);
    expect(SEED.branches.every((b) => b.institution === "NUH Health & U")).toBe(true);
  });
  it("has the 16 product SKUs", () => {
    expect(SEED.products).toHaveLength(16);
    expect(SEED.products[0]).toEqual({
      description: "CoolDiscreet (M)",
      sku: "CD-M-20",
      type: "Bag",
    });
  });
});
