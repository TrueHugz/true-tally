import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { loadPending } from "../queue/pendingStore";
import { mergeEntries } from "../domain/merge";

export function useLogs(repo: WorkbookRepo, pendingVersion: number) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const reload = useCallback(async () => {
    await repo.ensureWorkbook();
    const server = await repo.getLogs();
    setEntries(mergeEntries(server, loadPending()));
  }, [repo]);

  // Re-merge whenever the queue changes (pendingVersion bumps) or on mount.
  useEffect(() => { void reload(); }, [reload, pendingVersion]);

  return { entries, reload };
}
