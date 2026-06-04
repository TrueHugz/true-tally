import type { Institution } from "../data/types";
import { SearchableSelect } from "./SearchableSelect";

export function InstitutionSelector({
  institutions, value, onChange,
}: {
  institutions: Institution[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SearchableSelect
      label="Institution"
      options={institutions.map((i) => ({ value: i.institution, label: i.institution }))}
      value={value}
      onSelect={onChange}
    />
  );
}
