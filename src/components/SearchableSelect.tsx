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
    <div className="relative">
      <input
        aria-label={label}
        value={open ? query : selectedLabel}
        placeholder={`Search ${label.toLowerCase()}…`}
        className="combo-search w-full min-h-12.5 rounded-field border border-line bg-surface py-3.5 pl-3.75 pr-11 font-body text-control text-ink placeholder:text-ink-3 transition duration-150 ease-out focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute inset-x-0 z-30 mt-2 max-h-75 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-pop motion-safe:animate-[pop-in_.14s_ease]">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              className="block min-h-12 w-full cursor-pointer rounded-field border border-transparent bg-transparent px-3.5 py-3.25 text-left font-medium text-ink transition duration-150 ease-out hover:bg-surface-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && !query.trim() && (
            <div className="p-3.5 text-sm text-ink-3">No options yet — type to add one.</div>
          )}
          {query.trim() && (
            <button
              type="button"
              className="mt-1 block min-h-12 w-full cursor-pointer rounded-b-field border border-transparent border-t-line bg-transparent px-3.5 py-3.25 text-left font-bold text-accent transition duration-150 ease-out hover:bg-accent-soft"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAddNew(query.trim()); setOpen(false); }}
            >
              {addNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
