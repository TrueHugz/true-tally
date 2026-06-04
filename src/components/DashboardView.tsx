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
    <div className="card stagger-card">
      <h2 className="section-title">Totals</h2>

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

      <div className="stat">
        <span className="stat__num">{totalUnits}</span>
        <span className="stat__label">total units {periodLabel}</span>
      </div>

      <TotalsTable totals={totals} loading={loading} />

      <div className="save-row">
        <button type="button" className="primary" onClick={() => onExport(window)}>
          Generate Excel Report
        </button>
      </div>
    </div>
  );
}
