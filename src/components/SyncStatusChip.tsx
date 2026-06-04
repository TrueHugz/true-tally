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
  return (
    <button type="button" className={`chip ${state}`} onClick={onSync} title="Sync now">
      <span className="chip__dot" aria-hidden="true" />
      {text}
    </button>
  );
}
