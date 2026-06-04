import type { Branch, Product } from "./types";

const norm = (v: string) => v.trim().toLowerCase();

export function branchExists(branches: Branch[], institution: string, branch: string): boolean {
  return branches.some((b) => b.institution === institution && norm(b.branch) === norm(branch));
}

export function productExists(products: Product[], sku: string): boolean {
  return products.some((p) => norm(p.sku) === norm(sku));
}
