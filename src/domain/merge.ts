import type { LogEntry } from "../data/types";

export function mergeEntries(server: LogEntry[], pending: LogEntry[]): LogEntry[] {
  const seen = new Set(server.map((e) => e.entryId));
  return [...server, ...pending.filter((p) => !seen.has(p.entryId))];
}
