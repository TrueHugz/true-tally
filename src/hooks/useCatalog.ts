import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import type { Branch, Institution, Product } from "../data/types";

const EMPTY = {
  institutions: [] as Institution[],
  branches: [] as Branch[],
  products: [] as Product[],
};

export function useCatalog(repo: WorkbookRepo) {
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      await repo.ensureWorkbook();
      const [institutions, branches, products] = await Promise.all([
        repo.getInstitutions(),
        repo.getBranches(),
        repo.getProducts(),
      ]);
      return { institutions, branches, products };
    },
  });

  const { refetch } = q;
  const reload = useCallback(async () => { await refetch(); }, [refetch]);
  const data = q.data ?? EMPTY;

  return {
    institutions: data.institutions,
    branches: data.branches,
    products: data.products,
    loading: q.isPending,
    error: q.error ? String(q.error) : null,
    reload,
  };
}
