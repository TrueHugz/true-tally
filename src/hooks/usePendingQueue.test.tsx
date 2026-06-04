import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePendingQueue } from "./usePendingQueue";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

vi.mock("../queue/syncWorker", () => ({
  syncPending: vi.fn(async () => ({ synced: [], remaining: 1 })),
}));

const entry: LogEntry = {
  entryId: "p1", activityDate: "2026-06-05", institution: "NUH", branch: "B1",
  activityType: "Stock Take", product: "P1", sku: "S1", quantity: 5,
  loggedAt: "2026-06-05T00:00:00.000Z",
};

function fakeRepo(): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [],
    getBranches: async () => [],
    getProducts: async () => [],
    getLogs: async () => [],
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
  };
}

beforeEach(() => localStorage.clear());

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false } },
  });
  client.setQueryData<LogEntry[]>(["logs"], []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => usePendingQueue(fakeRepo()), { wrapper });
  return { client, result };
}

describe("usePendingQueue", () => {
  it("optimistically inserts the entry into the logs cache and tracks its id", () => {
    const { client, result } = setup();

    act(() => result.current.enqueue(entry));

    const logs = client.getQueryData<LogEntry[]>(["logs"]) ?? [];
    expect(logs.some((e) => e.entryId === "p1")).toBe(true);
    expect(result.current.pendingIds.has("p1")).toBe(true);
    expect(result.current.pendingCount).toBe(1);
  });

  it("invalidates the logs query after a sync", async () => {
    const { client, result } = setup();
    const spy = vi.spyOn(client, "invalidateQueries");

    await act(async () => { await result.current.sync(); });

    expect(spy).toHaveBeenCalledWith({ queryKey: ["logs"] });
  });
});
