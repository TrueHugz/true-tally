import { describe, it, expect, beforeEach } from "vitest";
import { syncPending } from "./syncWorker";
import { savePending, loadPending } from "./pendingStore";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

const mk = (id: string): LogEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

function fakeRepo(overrides: Partial<WorkbookRepo> = {}): { repo: WorkbookRepo; appended: string[] } {
  const appended: string[] = [];
  const repo = {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [], getBranches: async () => [], getProducts: async () => [],
    getLogs: async () => [], hasLog: async () => false,
    appendLog: async (e: LogEntry) => { appended.push(e.entryId); },
    addInstitution: async () => {}, addBranch: async () => {}, addProduct: async () => {},
    ...overrides,
  } as WorkbookRepo;
  return { repo, appended };
}

describe("syncPending", () => {
  beforeEach(() => localStorage.clear());

  it("appends each queued entry and clears the queue", async () => {
    savePending([mk("a"), mk("b")]);
    const { repo, appended } = fakeRepo();
    const result = await syncPending(repo);
    expect(appended).toEqual(["a", "b"]);
    expect(result).toEqual({ synced: ["a", "b"], remaining: 0 });
    expect(loadPending()).toEqual([]);
  });

  it("skips appending when the entry already exists (idempotent retry) but still dequeues", async () => {
    savePending([mk("a")]);
    const { repo, appended } = fakeRepo({ hasLog: async () => true });
    const result = await syncPending(repo);
    expect(appended).toEqual([]);
    expect(result.remaining).toBe(0);
  });

  it("stops on error, leaving the failed entry queued", async () => {
    savePending([mk("a"), mk("b")]);
    const { repo } = fakeRepo({
      appendLog: async (e: LogEntry) => { if (e.entryId === "b") throw new Error("offline"); },
    });
    const result = await syncPending(repo);
    expect(result.synced).toEqual(["a"]);
    expect(result.remaining).toBe(1);
    expect(result.error).toContain("offline");
    expect(loadPending().map((e) => e.entryId)).toEqual(["b"]);
  });
});
