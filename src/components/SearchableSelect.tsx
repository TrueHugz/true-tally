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
        className="combo-search w-full min-h-[50px] rounded-field border border-line bg-surface py-[14px] pl-[15px] pr-[44px] font-body text-[17px] text-ink placeholder:text-ink-3 [transition:border-color_.15s_ease,box-shadow_.15s_ease,background-color_.15s_ease] focus:border-accent focus:shadow-[0_0_0_4px_var(--color-accent-soft)] focus:outline-none"
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute inset-x-0 z-30 mt-2 max-h-[300px] overflow-auto rounded-[16px] border border-line bg-surface p-[6px] shadow-pop motion-safe:animate-[pop-in_.14s_ease]">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              className="block min-h-12 w-full cursor-pointer rounded-field border border-transparent bg-transparent px-[14px] py-[13px] text-left font-medium text-ink [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease] hover:bg-surface-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && !query.trim() && (
            <div className="p-[14px] text-[14px] text-ink-3">No options yet — type to add one.</div>
          )}
          {query.trim() && (
            <button
              type="button"
              className="mt-1 block min-h-12 w-full cursor-pointer rounded-b-field border border-transparent border-t-line bg-transparent px-[14px] py-[13px] text-left font-bold text-accent [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease] hover:bg-accent-soft"
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
