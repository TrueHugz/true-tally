interface Option<T extends string> { value: T; label: string; }

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
  const cls = ["segmented", variant === "activity" ? "segmented--activity" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          value={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
