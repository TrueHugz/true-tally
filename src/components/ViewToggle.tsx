import { Segmented } from "./Segmented";

export type View = "log" | "dashboard";

export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <Segmented
      ariaLabel="View"
      className="mb-[clamp(18px,3vw,26px)] max-w-[420px] motion-safe:animate-[rise_.5s_ease_.06s_both]"
      options={[{ value: "log", label: "Log Entry" }, { value: "dashboard", label: "Dashboard" }]}
      value={value}
      onChange={onChange}
    />
  );
}
