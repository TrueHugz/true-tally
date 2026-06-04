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
      <h2 className="mb-[14px] flex items-center gap-[10px] font-display text-[18px] font-semibold text-ink">Totals</h2>

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

      <div className="mt-[6px] mb-[22px] flex items-baseline gap-[14px] rounded-[16px] border border-line bg-surface-2 p-[20px] max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-[4px]">
        <span className="font-display text-[clamp(40px,9vw,58px)] font-extrabold leading-[.9] tabular-nums text-accent">{totalUnits}</span>
        <span className="font-body text-[13px] font-semibold uppercase tracking-[.06em] text-ink-2">total units {periodLabel}</span>
      </div>

      <TotalsTable totals={totals} loading={loading} />

      <div className="mt-6">
        <button
          type="button"
          className="w-full cursor-pointer rounded-field border border-accent bg-accent p-[18px] text-[18px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(14,124,102,.65)] [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-accent-2 hover:bg-accent-2 active:scale-[.98] focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft),0_12px_26px_-12px_rgba(14,124,102,.65)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
          onClick={() => onExport(window)}
        >
          Generate Excel Report
        </button>
      </div>
    </div>
  );
}
