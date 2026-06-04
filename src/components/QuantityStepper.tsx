export function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(0, value - 1))}>–</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        aria-label="Quantity"
      />
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
