import type { ProductTotal } from "../data/types";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export function TotalsTable({ totals, loading = false }: { totals: ProductTotal[]; loading?: boolean }) {
  if (loading && totals.length === 0) {
    return (
      <div className="totals-wrap">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-row" key={i}>
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: "50%", height: 16 }} />
              <Skeleton style={{ width: "28%", height: 12, marginTop: 8 }} />
            </div>
            <Skeleton style={{ width: 40, height: 22 }} />
          </div>
        ))}
      </div>
    );
  }

  if (totals.length === 0) {
    return (
      <EmptyState
        title="Nothing logged for this period"
        message="Switch the time range or log a new entry to see totals here."
      />
    );
  }

  return (
    <div className="totals-wrap">
      <table>
        <thead>
          <tr><th>Product</th><th>SKU</th><th className="num">Total units</th></tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.sku || t.product}>
              <td>{t.product}</td>
              <td className="sku">{t.sku}</td>
              <td className="num">{t.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
