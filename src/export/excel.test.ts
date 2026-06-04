import { describe, it, expect } from "vitest";
import { utils } from "xlsx";
import { buildWorkbook } from "./excel";
import type { LogEntry } from "../data/types";

const entry: LogEntry = {
  entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Main Building (Zone F)", activityType: "Stock Top Up",
  product: "CoolGuard (L)", sku: "CG-L-15", quantity: 12, loggedAt: "x",
};

describe("buildWorkbook", () => {
  it("creates a Report sheet with the 5 PRD columns in order", async () => {
    const wb = await buildWorkbook([entry]);
    expect(wb.SheetNames).toEqual(["Report"]);
    const ws = wb.Sheets["Report"];
    const aoa = utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(aoa[0]).toEqual([
      "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
    ]);
    expect(aoa[1]).toEqual(["2026-06-05", "Main Building (Zone F)", "Stock Top Up", "CoolGuard (L)", 12]);
  });
});
