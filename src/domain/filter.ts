import type { LogEntry, TimeWindow } from "../data/types";
import { monthPrefix } from "./dates";

export function filterByWindow(entries: LogEntry[], window: TimeWindow, today: string): LogEntry[] {
  if (window === "toDate") return entries;
  if (window === "day") return entries.filter((e) => e.activityDate === today);
  const prefix = monthPrefix(today);
  return entries.filter((e) => monthPrefix(e.activityDate) === prefix);
}
