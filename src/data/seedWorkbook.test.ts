import { describe, it, expect } from "vitest";
import { read, utils } from "xlsx";
import { buildSeedWorkbookBytes } from "./seedWorkbook";

describe("buildSeedWorkbookBytes", () => {
  it("produces a workbook with the four named sheets and seeded headers", () => {
    const wb = read(buildSeedWorkbookBytes(), { type: "array" });
    expect(wb.SheetNames).toEqual(["Institutions", "Branches", "Products", "Logs"]);

    const products = utils.sheet_to_json<string[]>(wb.Sheets["Products"], { header: 1 });
    expect(products[0]).toEqual(["Description", "SKU", "Type"]);
    expect(products).toHaveLength(17); // header + 16 SKUs

    const logs = utils.sheet_to_json<string[]>(wb.Sheets["Logs"], { header: 1 });
    expect(logs[0]).toEqual([
      "Entry ID", "Activity Date", "Institution", "Branch",
      "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
    ]);
    expect(logs).toHaveLength(1); // header only
  });
});
