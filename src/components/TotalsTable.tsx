import type { ProductTotal } from "../data/types";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export function TotalsTable({ totals, loading = false }: { totals: ProductTotal[]; loading?: boolean }) {
  if (loading && totals.length === 0) {
    return (
      <div className="mt-4.5 overflow-x-auto">
        {[0, 1, 2].map((i) => (
          <div className="flex items-center gap-3.5 border-b border-line px-1 py-3.5 last:border-b-0" key={i}>
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

  const th = "border-b border-line-2 px-3 py-2.5 text-left font-body text-tag font-bold uppercase tracking-label text-ink-3";
  const td = "border-b border-line px-3 py-3.75 align-middle text-base text-ink";
  const tdNum = `${td} text-right font-display text-figure font-bold tabular-nums`;
  const tdSku = `${td} font-mono text-meta text-ink-3`;

  return (
    <div className="mt-4.5 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr><th className={th}>Product</th><th className={th}>SKU</th><th className={`${th} text-right`}>Total units</th></tr>
        </thead>
        <tbody>
          {totals.map((t) => (
            <tr key={t.sku || t.product} className="transition-colors duration-100 [&:last-child>td]:border-b-0 [&:hover>td]:bg-surface-2">
              <td className={td}>{t.product}</td>
              <td className={tdSku}>{t.sku}</td>
              <td className={tdNum}>{t.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
