import { useState } from "react";
import type { ActivityType, Branch, Product } from "../data/types";
import { validateEntry } from "../domain/validate";
import { Segmented } from "./Segmented";
import { SearchableSelect } from "./SearchableSelect";
import { QuantityStepper } from "./QuantityStepper";

export interface NewEntry {
  institution: string;
  branch: string;
  activityType: ActivityType;
  activityDate: string;
  product: string;
  sku: string;
  quantity: number;
}

export function LogEntryView({
  institution, branches, products, today, onSave, onAddBranch, onAddProduct,
}: {
  institution: string;
  branches: Branch[];
  products: Product[];
  today: string;
  onSave: (entry: NewEntry) => void;
  onAddBranch: (name: string) => void;
  onAddProduct: (name: string) => void;
}) {
  const [branch, setBranch] = useState("");
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activityDate, setActivityDate] = useState(today);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const product = products.find((p) => p.sku === sku)?.description ?? "";
  const branchOptions = branches.filter((b) => b.institution === institution).map((b) => ({ value: b.branch, label: b.branch }));
  const productOptions = products.map((p) => ({ value: p.sku, label: p.description }));

  function handleSave() {
    const draft = { institution, branch, activityType, activityDate, product, sku, quantity };
    const errs = validateEntry(draft);
    setErrors(errs);
    if (errs.length > 0 || !activityType) return;
    onSave({ institution, branch, activityType, activityDate, product, sku, quantity });
    // Keep branch + date for fast multi-product logging; reset the rest.
    setActivityType(null);
    setSku("");
    setQuantity(0);
    setErrors([]);
  }

  const fieldLabel = "mt-[22px] mb-2 block font-body text-[12px] font-bold uppercase tracking-[.08em] text-ink-2";

  return (
    <div className="rounded-card border border-line bg-surface p-[clamp(20px,3.5vw,30px)] shadow-card motion-safe:animate-[rise_.5s_ease_.12s_both]">
      <h2 className="mb-[14px] flex items-center gap-[10px] font-display text-[18px] font-semibold text-ink">Log an entry</h2>

      <label className={`${fieldLabel} mt-1`}>Branch</label>
      <SearchableSelect label="Branch" options={branchOptions} value={branch}
        onSelect={setBranch} onAddNew={onAddBranch} addNewLabel="+ Add branch" />

      <label className={fieldLabel}>Activity Type</label>
      <Segmented
        ariaLabel="Activity Type"
        variant="activity"
        options={[{ value: "Stock Take", label: "Stock Take" }, { value: "Stock Top Up", label: "Stock Top Up" }]}
        value={activityType}
        onChange={(v) => setActivityType(v)}
      />

      <label className={fieldLabel} htmlFor="activity-date">Activity Date</label>
      <input
        id="activity-date"
        type="date"
        value={activityDate}
        onChange={(e) => setActivityDate(e.target.value)}
        className="w-full min-h-[50px] rounded-field border border-line bg-surface px-[15px] py-[14px] font-mono text-[16px] text-ink [transition:border-color_.15s_ease,box-shadow_.15s_ease,background-color_.15s_ease] focus:border-accent focus:shadow-[0_0_0_4px_var(--color-accent-soft)] focus:outline-none"
      />

      <label className={fieldLabel}>Product</label>
      <SearchableSelect label="Product" options={productOptions} value={sku}
        onSelect={setSku} onAddNew={onAddProduct} addNewLabel="+ Add product" />

      <label className={fieldLabel}>Quantity</label>
      <QuantityStepper value={quantity} onChange={setQuantity} />

      {errors.length > 0 && (
        <ul className="mt-[18px] list-none rounded-[16px] border border-[#efc7c0] bg-err-bg px-4 py-[14px] text-err-ink">
          {errors.map((e) => (
            <li key={e} className="error-bullet my-[6px] flex items-start gap-[9px] text-[15px] font-medium">{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <button
          type="button"
          className="w-full cursor-pointer rounded-field border border-accent bg-accent p-[18px] text-[18px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(14,124,102,.65)] [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-accent-2 hover:bg-accent-2 active:scale-[.98] focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft),0_12px_26px_-12px_rgba(14,124,102,.65)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
          onClick={handleSave}
        >Save entry</button>
      </div>
    </div>
  );
}
