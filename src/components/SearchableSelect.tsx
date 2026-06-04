import { useMemo, useState } from "react";

interface Option { value: string; label: string; }

export function SearchableSelect({
  label, options, value, onSelect, onAddNew, addNewLabel,
}: {
  label: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  onAddNew: (typedLabel: string) => void;
  addNewLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div className="combo">
      <input
        aria-label={label}
        value={open ? query : selectedLabel}
        placeholder={`Search ${label.toLowerCase()}…`}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="combo-list">
          {filtered.map((o) => (
            <button key={o.value} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(o.value); setOpen(false); }}>
              {o.label}
            </button>
          ))}
          {query.trim() && (
            <button type="button" className="muted" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAddNew(query.trim()); setOpen(false); }}>
              {addNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
