import type { ActivityType } from "../data/types";

export interface EntryDraft {
  institution: string;
  branch: string;
  activityType: ActivityType | null;
  activityDate: string;
  product: string;
  sku: string;
  quantity: number | null;
}

export function validateEntry(d: EntryDraft): string[] {
  const errs: string[] = [];
  if (!d.institution) errs.push("Select an institution");
  if (!d.branch) errs.push("Select a branch");
  if (!d.activityType) errs.push("Choose Stock Take or Stock Top Up");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.activityDate)) errs.push("Pick a valid date");
  if (!d.product) errs.push("Select a product");
  if (d.quantity == null || !Number.isInteger(d.quantity) || d.quantity <= 0) {
    errs.push("Quantity must be a whole number greater than 0");
  }
  return errs;
}
