import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { loadPending } from "../queue/pendingStore";
import { mergeEntries } from "../domain/merge";

export function useLogs(repo: WorkbookRepo, pendingVersion: number) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await repo.ensureWorkbook();
      const server = await repo.getLogs();
      setEntries(mergeEntries(server, loadPending()));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  // Re-merge whenever the queue changes (pendingVersion bumps) or on mount.
  // Intentional load-on-mount: async fetch that setState()s after awaiting I/O, not a synchronous cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload, pendingVersion]);

  return { entries, reload, error, loading };
}
