import type { WorkbookRepo } from "../data/repo";
import { loadPending, removePending } from "./pendingStore";

export interface SyncResult {
  synced: string[];
  remaining: number;
  error?: string;
}

/** Append every queued entry to the workbook, dequeuing on success. Stops at the first failure. */
export async function syncPending(repo: WorkbookRepo): Promise<SyncResult> {
  const synced: string[] = [];
  for (const entry of loadPending()) {
    try {
      if (!(await repo.hasLog(entry.entryId))) {
        await repo.appendLog(entry);
      }
      removePending(entry.entryId);
      synced.push(entry.entryId);
    } catch (e) {
      return { synced, remaining: loadPending().length, error: String(e) };
    }
  }
  return { synced, remaining: loadPending().length };
}
