/** A refined error/warning banner with optional retry and collapsible details. */
export function StateBanner({
  title,
  message,
  detail,
  onRetry,
  tone = "error",
}: {
  title: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
  tone?: "error" | "warn";
}) {
  const toneCls =
    tone === "warn"
      ? "border-[#ecd6a6] bg-warn-bg text-warn-ink"
      : "border-[#efc7c0] bg-err-bg text-err-ink";
  return (
    <div className={`mb-[18px] flex items-start gap-[14px] rounded-[16px] border px-[20px] py-[18px] ${toneCls}`} role="alert">
      <span className="mt-[1px] size-6 flex-none [&_svg]:block [&_svg]:size-6" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7.5v5M12 16.2h.01" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-bold">{title}</div>
        <div className="mt-1 text-[14px] text-inherit opacity-[.92]">{message}</div>
        {detail && (
          <details className="mt-[10px] text-[13px]">
            <summary className="cursor-pointer font-semibold opacity-[.85]">Technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-field bg-black/5 px-[12px] py-[10px] font-mono text-[12px]">{detail}</pre>
          </details>
        )}
        {onRetry && (
          <button
            type="button"
            className="mt-[12px] min-h-[40px] w-auto cursor-pointer rounded-field border border-current bg-white/70 px-4 py-[9px] text-base font-semibold text-inherit [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-ink-3 active:scale-[.98] focus-visible:border-accent focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
