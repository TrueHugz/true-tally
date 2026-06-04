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
      className="select-chevron w-full min-h-12.5 max-w-85 cursor-pointer rounded-field border border-line bg-surface py-3.5 pl-3.75 pr-10.5 font-body text-control text-ink transition duration-150 ease-out focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {institutions.map((i) => (
        <option key={i.institution} value={i.institution}>{i.institution}</option>
      ))}
    </select>
  );
}
