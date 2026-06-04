import type { ProductTotal } from "../data/types";

export function TotalsTable({ totals }: { totals: ProductTotal[] }) {
  if (totals.length === 0) {
    return <p className="muted">No entries for this period yet.</p>;
  }
  return (
    <table>
      <thead>
        <tr><th>Product</th><th>SKU</th><th className="num">Total units</th></tr>
      </thead>
      <tbody>
        {totals.map((t) => (
          <tr key={t.sku || t.product}>
            <td>{t.product}</td><td>{t.sku}</td><td className="num">{t.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
