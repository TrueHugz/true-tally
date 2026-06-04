export function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-4.5 rounded-card border border-line bg-surface-2 p-4.5">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="grid size-17 min-h-17 flex-none cursor-pointer place-items-center rounded-pill border border-line-2 bg-surface p-0 text-stepper font-medium leading-none text-accent shadow-soft transition duration-150 ease-out hover:border-accent hover:bg-accent-soft active:scale-[.94] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-narrow:size-15 max-narrow:min-h-15"
        onClick={() => onChange(Math.max(0, value - 1))}
      >–</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        aria-label="Quantity"
        className="no-spinner w-35 border-none bg-transparent p-0 text-center font-display text-quantity font-bold tabular-nums text-ink focus:shadow-none focus:outline-none max-narrow:w-27.5 max-narrow:text-quantity-sm"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        className="grid size-17 min-h-17 flex-none cursor-pointer place-items-center rounded-pill border border-line-2 bg-surface p-0 text-stepper font-medium leading-none text-accent shadow-soft transition duration-150 ease-out hover:border-accent hover:bg-accent-soft active:scale-[.94] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-narrow:size-15 max-narrow:min-h-15"
        onClick={() => onChange(value + 1)}
      >+</button>
    </div>
  );
}
