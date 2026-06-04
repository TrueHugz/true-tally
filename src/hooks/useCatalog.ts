import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { Branch, Institution, Product } from "../data/types";

export function useCatalog(repo: WorkbookRepo) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await repo.ensureWorkbook();
      const [i, b, p] = await Promise.all([repo.getInstitutions(), repo.getBranches(), repo.getProducts()]);
      setInstitutions(i);
      setBranches(b);
      setProducts(p);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  // Intentional load-on-mount: async fetch that setState()s after awaiting I/O, not a synchronous cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload]);

  return { institutions, branches, products, loading, error, reload };
}
