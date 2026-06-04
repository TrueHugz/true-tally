import type { WorkbookRepo } from "./repo";
import type { Branch, Institution, LogEntry, Product } from "./types";
import { buildSeedWorkbookBytes } from "./seedWorkbook";
import {
  branchToRow, rowToBranch, institutionToRow, rowToInstitution,
  productToRow, rowToProduct, logToRow, rowToLog,
} from "./rowMap";

const GRAPH = "https://graph.microsoft.com/v1.0";
export const FILE_NAME = "TrueHugz-Inventory-Log.xlsx";

type Cell = string | number;

export class GraphWorkbookRepo implements WorkbookRepo {
  private itemId: string | null = null;
  private getToken: () => Promise<string>;

  constructor(getToken: () => Promise<string>) {
    this.getToken = getToken;
  }

  private async req(path: string, init: RequestInit = {}): Promise<unknown> {
    const token = await this.getToken();
    const res = await fetch(`${GRAPH}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const err = new Error(`Graph ${res.status} ${path}: ${await res.text()}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  private async putContent(path: string, body: ArrayBuffer): Promise<{ id: string }> {
    const token = await this.getToken();
    const res = await fetch(`${GRAPH}${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body,
    });
    if (!res.ok) throw new Error(`Graph PUT ${res.status} ${path}: ${await res.text()}`);
    return (await res.json()) as { id: string };
  }

  async ensureWorkbook(): Promise<void> {
    if (this.itemId) return;
    try {
      const item = (await this.req(`/me/drive/root:/${encodeURIComponent(FILE_NAME)}`)) as { id: string };
      this.itemId = item.id;
      return;
    } catch (e) {
      if ((e as { status?: number }).status !== 404) throw e;
    }
    const created = await this.putContent(
      `/me/drive/root:/${encodeURIComponent(FILE_NAME)}:/content`,
      await buildSeedWorkbookBytes(),
    );
    this.itemId = created.id;
    await this.defineTables();
  }

  /** Convert each seeded sheet's used range into a named Excel Table so the rows API works. */
  private async defineTables(): Promise<void> {
    const sheets = ["Institutions", "Branches", "Products", "Logs"];
    for (const sheet of sheets) {
      const used = (await this.req(
        `/me/drive/items/${this.itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange?$select=address`,
      )) as { address: string };
      const range = used.address.substring(used.address.lastIndexOf("!") + 1); // strip "Sheet!" prefix
      const added = (await this.req(
        `/me/drive/items/${this.itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/tables/add`,
        { method: "POST", body: JSON.stringify({ address: range, hasHeaders: true }) },
      )) as { id: string };
      await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${added.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: sheet }),
      });
    }
  }

  private async tableRows(table: string): Promise<Cell[][]> {
    await this.ensureWorkbook();
    const res = (await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${table}/rows`)) as {
      value: { values: Cell[][] }[];
    };
    return res.value.map((r) => r.values[0]);
  }

  private async addRow(table: string, values: Cell[]): Promise<void> {
    await this.ensureWorkbook();
    await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${table}/rows/add`, {
      method: "POST",
      body: JSON.stringify({ values: [values] }),
    });
  }

  async getInstitutions(): Promise<Institution[]> {
    return (await this.tableRows("Institutions")).map(rowToInstitution);
  }
  async getBranches(): Promise<Branch[]> {
    return (await this.tableRows("Branches")).map(rowToBranch);
  }
  async getProducts(): Promise<Product[]> {
    return (await this.tableRows("Products")).map(rowToProduct);
  }
  async getLogs(): Promise<LogEntry[]> {
    return (await this.tableRows("Logs")).map(rowToLog);
  }
  async appendLog(entry: LogEntry): Promise<void> {
    await this.addRow("Logs", logToRow(entry));
  }
  // Single-user volumes: a full scan is acceptable; revisit if log volume grows.
  async hasLog(entryId: string): Promise<boolean> {
    return (await this.getLogs()).some((l) => l.entryId === entryId);
  }
  async addInstitution(i: Institution): Promise<void> {
    await this.addRow("Institutions", institutionToRow(i));
  }
  async addBranch(b: Branch): Promise<void> {
    await this.addRow("Branches", branchToRow(b));
  }
  async addProduct(p: Product): Promise<void> {
    await this.addRow("Products", productToRow(p));
  }
}
