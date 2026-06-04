import { utils, write } from "xlsx";
import { SEED } from "./seed";
import {
  INSTITUTION_COLUMNS, BRANCH_COLUMNS, PRODUCT_COLUMNS, LOG_COLUMNS,
  institutionToRow, branchToRow, productToRow,
} from "./rowMap";

type Cell = string | number;

/** Build an .xlsx (as bytes) with header rows + seed data, ready to upload to OneDrive. */
export function buildSeedWorkbookBytes(): ArrayBuffer {
  const wb = utils.book_new();
  const addSheet = (name: string, header: readonly string[], rows: Cell[][]) => {
    const ws = utils.aoa_to_sheet([[...header], ...rows]);
    utils.book_append_sheet(wb, ws, name);
  };
  addSheet("Institutions", INSTITUTION_COLUMNS, SEED.institutions.map(institutionToRow));
  addSheet("Branches", BRANCH_COLUMNS, SEED.branches.map(branchToRow));
  addSheet("Products", PRODUCT_COLUMNS, SEED.products.map(productToRow));
  addSheet("Logs", LOG_COLUMNS, []);
  return write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
