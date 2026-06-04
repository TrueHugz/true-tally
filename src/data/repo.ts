import type { Branch, Institution, LogEntry, Product } from "./types";

export interface WorkbookRepo {
  /** Locate the workbook, creating + provisioning it on first run. */
  ensureWorkbook(): Promise<void>;
  getInstitutions(): Promise<Institution[]>;
  getBranches(): Promise<Branch[]>;
  getProducts(): Promise<Product[]>;
  getLogs(): Promise<LogEntry[]>;
  appendLog(entry: LogEntry): Promise<void>;
  hasLog(entryId: string): Promise<boolean>;
  addInstitution(i: Institution): Promise<void>;
  addBranch(b: Branch): Promise<void>;
  addProduct(p: Product): Promise<void>;
}
