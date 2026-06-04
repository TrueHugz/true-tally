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

  return (
    <div className="card">
      <label>Branch</label>
      <SearchableSelect label="Branch" options={branchOptions} value={branch}
        onSelect={setBranch} onAddNew={onAddBranch} addNewLabel="+ Add branch" />

      <label>Activity Type</label>
      <Segmented
        ariaLabel="Activity Type"
        options={[{ value: "Stock Take", label: "Stock Take" }, { value: "Stock Top Up", label: "Stock Top Up" }]}
        value={activityType}
        onChange={(v) => setActivityType(v)}
      />

      <label htmlFor="activity-date">Activity Date</label>
      <input id="activity-date" type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />

      <label>Product</label>
      <SearchableSelect label="Product" options={productOptions} value={sku}
        onSelect={setSku} onAddNew={onAddProduct} addNewLabel="+ Add product" />

      <label>Quantity</label>
      <QuantityStepper value={quantity} onChange={setQuantity} />

      {errors.length > 0 && (
        <ul className="errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      <div style={{ marginTop: 20 }}>
        <button type="button" className="primary" onClick={handleSave}>Save entry</button>
      </div>
    </div>
  );
}
