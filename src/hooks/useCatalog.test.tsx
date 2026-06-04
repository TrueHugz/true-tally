import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCatalog } from "./useCatalog";
import { createWrapper } from "../test/queryWrapper";
import type { WorkbookRepo } from "../data/repo";

function fakeRepo(overrides: Partial<WorkbookRepo> = {}): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [{ institution: "NUH", remarks: "" }],
    getBranches: async () => [{ institution: "NUH", branch: "B1", remarks: "" }],
    getProducts: async () => [{ description: "P1", sku: "S1", type: "Bag" }],
    getLogs: async () => [],
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
    ...overrides,
  };
}

describe("useCatalog", () => {
  it("loads institutions, branches, and products", async () => {
    const repo = fakeRepo();
    const { result } = renderHook(() => useCatalog(repo), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.institutions).toHaveLength(1);
    expect(result.current.branches).toHaveLength(1);
    expect(result.current.products).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a thrown error as a string", async () => {
    const repo = fakeRepo({ getInstitutions: async () => { throw new Error("boom"); } });
    const { result } = renderHook(() => useCatalog(repo), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toContain("boom"));
  });
});
