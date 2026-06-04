import type { LogEntry, ProductTotal } from "../data/types";

export function totalsByProduct(entries: LogEntry[]): ProductTotal[] {
  const map = new Map<string, ProductTotal>();
  for (const e of entries) {
    const key = e.sku || e.product;
    const cur = map.get(key) ?? { product: e.product, sku: e.sku, total: 0 };
    cur.total += e.quantity;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.product.localeCompare(b.product));
}
