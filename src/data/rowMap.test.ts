import { describe, it, expect } from "vitest";
import {
  LOG_COLUMNS, logToRow, rowToLog,
  branchToRow, rowToBranch, productToRow, rowToProduct,
  institutionToRow, rowToInstitution,
} from "./rowMap";
import type { LogEntry } from "./types";

const log: LogEntry = {
  entryId: "e1", activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 7,
  loggedAt: "2026-06-05T01:02:03.000Z",
};

describe("rowMap", () => {
  it("LOG_COLUMNS are in the canonical order", () => {
    expect(LOG_COLUMNS).toEqual([
      "Entry ID", "Activity Date", "Institution", "Branch",
      "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
    ]);
  });
  it("round-trips a log entry through a row", () => {
    expect(rowToLog(logToRow(log))).toEqual(log);
  });
  it("coerces quantity from a string cell to a number", () => {
    const row = logToRow(log);
    row[7] = "7"; // Graph may return numbers as strings
    expect(rowToLog(row).quantity).toBe(7);
  });
  it("round-trips branches, products, institutions", () => {
    const b = { institution: "NUH Health & U", branch: "Zone B", remarks: "x" };
    expect(rowToBranch(branchToRow(b))).toEqual(b);
    const p = { description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" };
    expect(rowToProduct(productToRow(p))).toEqual(p);
    const i = { institution: "NUH Health & U", remarks: "" };
    expect(rowToInstitution(institutionToRow(i))).toEqual(i);
  });
});
