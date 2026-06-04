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
    <section className="card recent stagger-after" aria-label="Recent additions">
      <h2 className="section-title">Recent additions</h2>

      {loading && entries.length === 0 ? (
        <div className="recent__list">
          {[0, 1, 2].map((i) => (
            <div className="skeleton-row" key={i}>
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
        <div className="recent__list">
          {recent.map((e) => {
            const isTake = e.activityType === "Stock Take";
            const pending = pendingIds.has(e.entryId);
            return (
              <div
                key={e.entryId}
                className={`recent-row${e.entryId === newestId ? " is-newest" : ""}`}
              >
                <span className={`recent-row__dot ${isTake ? "is-take" : "is-topup"}`} aria-hidden="true" />
                <div className="recent-row__main">
                  <div className="recent-row__product">{e.product}</div>
                  <div className="recent-row__meta">
                    {e.branch} &middot; {formatDate(e.activityDate)}
                  </div>
                </div>
                <div className="recent-row__right">
                  <span className="recent-row__qty">{e.quantity}</span>
                  <span className="recent-row__kind">{isTake ? "Take" : "Top Up"}</span>
                  {pending && (
                    <span className="syncing-pill">
                      <span className="syncing-pill__dot" aria-hidden="true" />
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
