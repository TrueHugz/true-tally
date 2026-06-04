interface Option<T extends string> { value: T; label: string; }

const CONTAINER =
  "flex gap-[6px] rounded-pill border border-line bg-surface-2 p-[5px] shadow-[inset_0_1px_2px_rgba(16,33,28,.04)]";

const BTN_BASE =
  "flex-1 cursor-pointer rounded-pill border border-transparent bg-transparent font-semibold text-ink-2 [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:bg-white/50 hover:text-ink active:scale-[.98] focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)] focus-visible:outline-none aria-pressed:border-line aria-pressed:bg-surface aria-pressed:shadow-soft disabled:cursor-not-allowed disabled:opacity-50";

const BTN_DEFAULT = "min-h-12 px-4 py-[13px] aria-pressed:text-accent";
const BTN_ACTIVITY = "min-h-[60px] px-4 py-[18px] text-[17px]";

export function Segmented<T extends string>({
  options, value, onChange, ariaLabel, variant, className,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel: string;
  variant?: "activity";
  className?: string;
}) {
  const isActivity = variant === "activity";
  const cls = [CONTAINER, className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={cls} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const pressed = value === o.value;
        let btnCls = `${BTN_BASE} ${isActivity ? BTN_ACTIVITY : BTN_DEFAULT}`;
        if (isActivity && pressed) {
          btnCls += o.value === "Stock Take" ? " text-take" : o.value === "Stock Top Up" ? " text-topup" : "";
        }
        return (
          <button
            key={o.value}
            type="button"
            value={o.value}
            aria-pressed={pressed}
            className={btnCls}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
