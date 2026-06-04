import type { LogEntry } from "../data/types";

export const EXPORT_HEADERS = [
  "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
] as const;

export type ExportRow = Record<(typeof EXPORT_HEADERS)[number], string | number>;

export function toExportRows(entries: LogEntry[]): ExportRow[] {
  return entries.map((e) => ({
    "Timestamp / Date": e.activityDate,
    "Branch Name": e.branch,
    "Activity Type": e.activityType,
    "Product Name": e.product,
    "Quantity Recorded": e.quantity,
  }));
}
