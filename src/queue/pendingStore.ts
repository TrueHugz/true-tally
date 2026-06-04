import type { PendingEntry } from "../data/types";

const KEY = "truehugz.pendingEntries";

export function loadPending(): PendingEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePending(entries: PendingEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addPending(entry: PendingEntry): PendingEntry[] {
  const next = [...loadPending(), entry];
  savePending(next);
  return next;
}

export function removePending(entryId: string): PendingEntry[] {
  const next = loadPending().filter((e) => e.entryId !== entryId);
  savePending(next);
  return next;
}
