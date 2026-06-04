export type SyncState = "synced" | "pending" | "error";

export function SyncStatusChip({
  state, pendingCount, onSync,
}: {
  state: SyncState;
  pendingCount: number;
  onSync: () => void;
}) {
  const text =
    state === "synced" ? "All synced"
    : state === "pending" ? `${pendingCount} pending`
    : "Sync failed — will retry";
  const toneCls =
    state === "synced" ? "border-[#bfe0d2] bg-ok-bg text-ok-ink"
    : state === "pending" ? "border-[#ecd6a6] bg-warn-bg text-warn-ink"
    : "border-[#efc7c0] bg-err-bg text-err-ink";
  return (
    <button
      type="button"
      className={`inline-flex min-h-12.5 cursor-pointer items-center gap-2 rounded-pill border px-4 py-2.25 text-sm font-semibold transition duration-150 ease-out hover:border-ink-3 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${toneCls}`}
      onClick={onSync}
      title="Sync now"
    >
      <span
        className={`size-2 flex-none rounded-pill bg-current ${state === "pending" ? "motion-safe:animate-[pulse-soft_2s_ease-in-out_infinite]" : ""}`}
        aria-hidden="true"
      />
      {text}
    </button>
  );
}
