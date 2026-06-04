import type { Institution } from "../data/types";

export function InstitutionSelector({
  institutions, value, onChange,
}: {
  institutions: Institution[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label="Institution"
      className="select-chevron w-full min-h-[50px] max-w-[340px] cursor-pointer rounded-field border border-line bg-surface py-[14px] pl-[15px] pr-[42px] font-body text-[17px] text-ink [transition:border-color_.15s_ease,box-shadow_.15s_ease,background-color_.15s_ease] focus:border-accent focus:shadow-[0_0_0_4px_var(--color-accent-soft)] focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {institutions.map((i) => (
        <option key={i.institution} value={i.institution}>{i.institution}</option>
      ))}
    </select>
  );
}
