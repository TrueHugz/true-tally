import { useState } from "react";
import type { LogEntry, TimeWindow } from "../data/types";
import { filterByWindow } from "../domain/filter";
import { totalsByProduct } from "../domain/aggregate";
import { Segmented } from "./Segmented";
import { TotalsTable } from "./TotalsTable";

export function DashboardView({
  entries, today, onExport, loading = false,
}: {
  entries: LogEntry[];
  today: string;
  onExport: (window: TimeWindow) => void;
  loading?: boolean;
}) {
  const [window, setWindow] = useState<TimeWindow>("day");
  const totals = totalsByProduct(filterByWindow(entries, window, today));
  const totalUnits = totals.reduce((sum, t) => sum + t.total, 0);

  const periodLabel = window === "day" ? "today" : window === "month" ? "this month" : "to date";

  return (
    <div className="rounded-card border border-line bg-surface p-[clamp(20px,3.5vw,30px)] shadow-card motion-safe:animate-[rise_.5s_ease_.12s_both]">
      <h2 className="mb-3.5 flex items-center gap-2.5 font-display text-lg font-semibold text-ink">Totals</h2>

      <Segmented
        ariaLabel="Time filter"
        options={[
          { value: "day", label: "Day" },
          { value: "month", label: "Month" },
          { value: "toDate", label: "To-Date" },
        ]}
        value={window}
        onChange={setWindow}
      />

      <div className="mt-1.5 mb-5.5 flex items-baseline gap-3.5 rounded-2xl border border-line bg-surface-2 p-5 max-narrow:flex-col max-narrow:items-start max-narrow:gap-1">
        <span className="font-display text-stat font-extrabold leading-[.9] tabular-nums text-accent">{totalUnits}</span>
        <span className="font-body text-meta font-semibold uppercase tracking-stat text-ink-2">total units {periodLabel}</span>
      </div>

      <TotalsTable totals={totals} loading={loading} />

      <div className="mt-6">
        <button
          type="button"
          className="w-full cursor-pointer rounded-field border border-accent bg-accent p-4.5 text-lg font-bold text-white shadow-cta transition duration-150 ease-out hover:border-accent-2 hover:bg-accent-2 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
          onClick={() => onExport(window)}
        >
          Generate Excel Report
        </button>
      </div>
    </div>
  );
}
