import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogs } from "./useLogs";
import { createWrapper } from "../test/queryWrapper";
import { savePending } from "../queue/pendingStore";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

const serverEntry: LogEntry = {
  entryId: "s1", activityDate: "2026-06-05", institution: "NUH", branch: "B1",
  activityType: "Stock Take", product: "P1", sku: "S1", quantity: 2,
  loggedAt: "2026-06-05T00:00:00.000Z",
};
const pendingEntry: LogEntry = { ...serverEntry, entryId: "p1", quantity: 5 };

function repoWith(logs: LogEntry[]): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [],
    getBranches: async () => [],
    getProducts: async () => [],
    getLogs: async () => logs,
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
  };
}

beforeEach(() => localStorage.clear());

describe("useLogs", () => {
  it("merges server logs with pending entries", async () => {
    savePending([pendingEntry]);
    const repo = repoWith([serverEntry]);
    const { result } = renderHook(() => useLogs(repo), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.entryId).sort()).toEqual(["p1", "s1"]);
    expect(result.current.error).toBeNull();
  });
});
