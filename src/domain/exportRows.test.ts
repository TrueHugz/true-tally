import { describe, it, expect } from "vitest";
import { toExportRows, EXPORT_HEADERS } from "./exportRows";
import type { LogEntry } from "../data/types";

const entry: LogEntry = {
  entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Main Building (Zone F)", activityType: "Stock Top Up",
  product: "CoolGuard (L)", sku: "CG-L-15", quantity: 12, loggedAt: "2026-06-05T01:02:03.000Z",
};

describe("export rows", () => {
  it("exposes the five PRD headers in order", () => {
    expect(EXPORT_HEADERS).toEqual([
      "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
    ]);
  });
  it("maps a log entry to the 5-column shape using Activity Date", () => {
    expect(toExportRows([entry])).toEqual([
      {
        "Timestamp / Date": "2026-06-05",
        "Branch Name": "Main Building (Zone F)",
        "Activity Type": "Stock Top Up",
        "Product Name": "CoolGuard (L)",
        "Quantity Recorded": 12,
      },
    ]);
  });
});
