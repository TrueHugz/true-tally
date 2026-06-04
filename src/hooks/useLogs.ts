import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import { loadPending } from "../queue/pendingStore";
import { mergeEntries } from "../domain/merge";

export function useLogs(repo: WorkbookRepo) {
  const q = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      await repo.ensureWorkbook();
      return mergeEntries(await repo.getLogs(), loadPending());
    },
  });

  const { refetch } = q;
  const reload = useCallback(async () => { await refetch(); }, [refetch]);

  return {
    entries: q.data ?? [],
    reload,
    error: q.error ? String(q.error) : null,
    loading: q.isPending,
  };
}
