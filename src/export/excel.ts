import { utils, writeFileXLSX, type WorkBook } from "xlsx";
import { toExportRows, EXPORT_HEADERS } from "../domain/exportRows";
import type { LogEntry } from "../data/types";

export function buildWorkbook(entries: LogEntry[]): WorkBook {
  const rows = toExportRows(entries);
  const ws = utils.json_to_sheet(rows, { header: [...EXPORT_HEADERS] });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Report");
  return wb;
}

export function exportToExcel(entries: LogEntry[], filename: string): void {
  writeFileXLSX(buildWorkbook(entries), filename);
}
