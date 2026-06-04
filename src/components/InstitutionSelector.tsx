import type { Institution } from "../data/types";

export function InstitutionSelector({
  institutions, value, onChange,
}: {
  institutions: Institution[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select aria-label="Institution" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 320 }}>
      {institutions.map((i) => (
        <option key={i.institution} value={i.institution}>{i.institution}</option>
      ))}
    </select>
  );
}
