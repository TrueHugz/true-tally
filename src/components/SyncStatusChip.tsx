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
      className={`inline-flex min-h-11 cursor-pointer items-center gap-[8px] rounded-pill border px-[15px] py-[9px] text-[14px] font-semibold [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-ink-3 active:scale-[.98] focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${toneCls}`}
      onClick={onSync}
      title="Sync now"
    >
      <span
        className={`size-[8px] flex-none rounded-pill bg-current ${state === "pending" ? "motion-safe:animate-[pulse-soft_2s_ease-in-out_infinite]" : ""}`}
        aria-hidden="true"
      />
      {text}
    </button>
  );
}
