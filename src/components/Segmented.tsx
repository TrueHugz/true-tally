interface Option<T extends string> { value: T; label: string; }

export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
