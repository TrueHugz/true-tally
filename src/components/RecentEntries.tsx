import type { LogEntry } from "../data/types";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a YYYY-MM-DD date as e.g. "5 Jun 2026". Falls back to the raw string. */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const day = Number(m[3]);
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${day} ${month} ${m[1]}`;
}

export function RecentEntries({
  entries,
  pendingIds,
  loading = false,
}: {
  entries: LogEntry[];
  pendingIds: Set<string>;
  loading?: boolean;
}) {
  const recent = [...entries]
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : a.loggedAt > b.loggedAt ? -1 : 0))
    .slice(0, 6);

  const newestId = recent[0]?.entryId;

  return (
    <section className="mt-5 rounded-card border border-line bg-surface p-[clamp(20px,3.5vw,30px)] shadow-card motion-safe:animate-[rise_.5s_ease_.18s_both]" aria-label="Recent additions">
      <h2 className="mb-[14px] flex items-center gap-[10px] font-display text-[18px] font-semibold text-ink">Recent additions</h2>

      {loading && entries.length === 0 ? (
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div className="flex items-center gap-[14px] border-b border-line px-[4px] py-[14px] last:border-b-0" key={i}>
              <Skeleton style={{ width: 11, height: 11, borderRadius: 999 }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ width: "55%", height: 16 }} />
                <Skeleton style={{ width: "35%", height: 12, marginTop: 8 }} />
              </div>
              <Skeleton style={{ width: 44, height: 26 }} />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          title="No entries yet"
          message="Your logged stock will appear here as soon as you save an entry."
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h11l3 3v13H5z" />
              <path d="M9 9h6M9 13h6M9 17h4" />
            </svg>
          }
        />
      ) : (
        <div className="flex flex-col">
          {recent.map((e) => {
            const isTake = e.activityType === "Stock Take";
            const pending = pendingIds.has(e.entryId);
            const isNewest = e.entryId === newestId;
            return (
              <div
                key={e.entryId}
                className={`flex items-center gap-[14px] border-b border-line px-[4px] py-[14px] last:border-b-0 ${
                  isNewest
                    ? "rounded-field motion-safe:animate-[row-in_.35s_ease_both,highlight-fade_1.6s_ease_.35s_both]"
                    : "motion-safe:animate-[row-in_.35s_ease_both]"
                }`}
              >
                <span
                  className={`size-[11px] flex-none rounded-pill shadow-[0_0_0_4px_rgba(0,0,0,.03)] ${isTake ? "bg-take" : "bg-topup"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[16px] font-medium text-ink">{e.product}</div>
                  <div className="mt-[3px] font-mono text-[12px] text-ink-3">
                    {e.branch} &middot; {formatDate(e.activityDate)}
                  </div>
                </div>
                <div className="flex flex-none flex-col items-end gap-[2px] text-right">
                  <span className="font-display text-[24px] font-bold leading-none tabular-nums text-ink">{e.quantity}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-3">{isTake ? "Take" : "Top Up"}</span>
                  {pending && (
                    <span className="mt-1 inline-flex items-center gap-[6px] rounded-pill bg-warn-bg px-[9px] py-[4px] text-[11px] font-bold text-warn-ink">
                      <span className="size-[6px] rounded-pill bg-current" aria-hidden="true" />
                      Syncing…
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
