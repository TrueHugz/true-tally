import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { addPending, loadPending } from "../queue/pendingStore";
import { syncPending } from "../queue/syncWorker";
import type { SyncState } from "../components/SyncStatusChip";

export function usePendingQueue(repo: WorkbookRepo) {
  const [pendingCount, setPendingCount] = useState(loadPending().length);
  const [state, setState] = useState<SyncState>(loadPending().length ? "pending" : "synced");
  const [version, setVersion] = useState(0); // bump to trigger log re-merge

  const refresh = useCallback(() => {
    const n = loadPending().length;
    setPendingCount(n);
    setVersion((v) => v + 1);
    setState((prev) => (n === 0 ? "synced" : prev === "error" ? "error" : "pending"));
  }, []);

  const sync = useCallback(async () => {
    const result = await syncPending(repo);
    setState(result.error ? "error" : result.remaining > 0 ? "pending" : "synced");
    setPendingCount(result.remaining);
    setVersion((v) => v + 1);
  }, [repo]);

  const enqueue = useCallback((entry: LogEntry) => {
    addPending(entry);
    refresh();
    void sync(); // try immediately; harmless if offline
  }, [refresh, sync]);

  // Auto-sync on reconnect and when the tab regains focus.
  useEffect(() => {
    const onOnline = () => void sync();
    const onFocus = () => { if (loadPending().length) void sync(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [sync]);

  return { pendingCount, state, version, enqueue, sync };
}
