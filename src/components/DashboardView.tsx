import { useState } from "react";
import type { LogEntry, TimeWindow } from "../data/types";
import { filterByWindow } from "../domain/filter";
import { totalsByProduct } from "../domain/aggregate";
import { Segmented } from "./Segmented";
import { TotalsTable } from "./TotalsTable";

export function DashboardView({
  entries, today, onExport,
}: {
  entries: LogEntry[];
  today: string;
  onExport: (window: TimeWindow) => void;
}) {
  const [window, setWindow] = useState<TimeWindow>("day");
  const totals = totalsByProduct(filterByWindow(entries, window, today));

  return (
    <div className="card">
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
      <TotalsTable totals={totals} />
      <div style={{ marginTop: 20 }}>
        <button type="button" className="primary" onClick={() => onExport(window)}>
          Generate Excel Report
        </button>
      </div>
    </div>
  );
}
