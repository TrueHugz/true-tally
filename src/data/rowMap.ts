import type { ActivityType, Branch, Institution, LogEntry, Product } from "./types";

type Cell = string | number;

export const INSTITUTION_COLUMNS = ["Institution", "Remarks"] as const;
export const BRANCH_COLUMNS = ["Institution", "Branch", "Remarks"] as const;
export const PRODUCT_COLUMNS = ["Description", "SKU", "Type"] as const;
export const LOG_COLUMNS = [
  "Entry ID", "Activity Date", "Institution", "Branch",
  "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
] as const;

const s = (v: Cell | undefined): string => (v === undefined || v === null ? "" : String(v));

export function institutionToRow(i: Institution): Cell[] {
  return [i.institution, i.remarks];
}
export function rowToInstitution(r: Cell[]): Institution {
  return { institution: s(r[0]), remarks: s(r[1]) };
}

export function branchToRow(b: Branch): Cell[] {
  return [b.institution, b.branch, b.remarks];
}
export function rowToBranch(r: Cell[]): Branch {
  return { institution: s(r[0]), branch: s(r[1]), remarks: s(r[2]) };
}

export function productToRow(p: Product): Cell[] {
  return [p.description, p.sku, p.type];
}
export function rowToProduct(r: Cell[]): Product {
  return { description: s(r[0]), sku: s(r[1]), type: s(r[2]) };
}

export function logToRow(e: LogEntry): Cell[] {
  return [e.entryId, e.activityDate, e.institution, e.branch, e.activityType, e.product, e.sku, e.quantity, e.loggedAt];
}
export function rowToLog(r: Cell[]): LogEntry {
  return {
    entryId: s(r[0]),
    activityDate: s(r[1]),
    institution: s(r[2]),
    branch: s(r[3]),
    activityType: s(r[4]) as ActivityType,
    product: s(r[5]),
    sku: s(r[6]),
    quantity: Number(r[7]),
    loggedAt: s(r[8]),
  };
}
