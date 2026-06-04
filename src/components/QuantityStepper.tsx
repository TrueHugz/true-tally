export function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-[18px] rounded-card border border-line bg-surface-2 p-[18px]">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="grid size-[68px] min-h-[68px] flex-none cursor-pointer place-items-center rounded-pill border border-line-2 bg-surface p-0 text-[32px] font-medium leading-none text-accent shadow-soft [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-accent hover:bg-accent-soft active:scale-[.94] focus-visible:border-accent focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-[560px]:size-[60px] max-[560px]:min-h-[60px]"
        onClick={() => onChange(Math.max(0, value - 1))}
      >–</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        aria-label="Quantity"
        className="no-spinner w-[140px] border-none bg-transparent p-0 text-center font-display text-[52px] font-bold tabular-nums text-ink focus:shadow-none focus:outline-none max-[560px]:w-[110px] max-[560px]:text-[44px]"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        className="grid size-[68px] min-h-[68px] flex-none cursor-pointer place-items-center rounded-pill border border-line-2 bg-surface p-0 text-[32px] font-medium leading-none text-accent shadow-soft [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-accent hover:bg-accent-soft active:scale-[.94] focus-visible:border-accent focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-[560px]:size-[60px] max-[560px]:min-h-[60px]"
        onClick={() => onChange(value + 1)}
      >+</button>
    </div>
  );
}
