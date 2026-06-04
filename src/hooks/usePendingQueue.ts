import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { addPending, loadPending } from "../queue/pendingStore";
import { syncPending } from "../queue/syncWorker";
import { mergeEntries } from "../domain/merge";
import type { SyncState } from "../components/SyncStatusChip";

const idsOf = (entries: { entryId: string }[]) => new Set(entries.map((e) => e.entryId));

export function usePendingQueue(repo: WorkbookRepo) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(loadPending().length);
  const [state, setState] = useState<SyncState>(loadPending().length ? "pending" : "synced");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => idsOf(loadPending()));

  const refresh = useCallback(() => {
    const pending = loadPending();
    setPendingCount(pending.length);
    setPendingIds(idsOf(pending));
    setState((prev) => (pending.length === 0 ? "synced" : prev === "error" ? "error" : "pending"));
  }, []);

  const sync = useCallback(async () => {
    const result = await syncPending(repo);
    setState(result.error ? "error" : result.remaining > 0 ? "pending" : "synced");
    setPendingCount(result.remaining);
    setPendingIds(idsOf(loadPending()));
    await queryClient.invalidateQueries({ queryKey: ["logs"] });
  }, [repo, queryClient]);

  const enqueue = useCallback((entry: LogEntry) => {
    addPending(entry);
    // Optimistic insert so the new row shows immediately, before the server round-trip.
    queryClient.setQueryData<LogEntry[]>(["logs"], (old) => mergeEntries(old ?? [], [entry]));
    refresh();
    void sync(); // try immediately; harmless if offline
  }, [queryClient, refresh, sync]);

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

  return { pendingCount, state, pendingIds, enqueue, sync };
}
