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
    <div className={`mb-4.5 flex items-start gap-3.5 rounded-2xl border px-5 py-4.5 ${toneCls}`} role="alert">
      <span className="mt-px size-6 flex-none [&_svg]:block [&_svg]:size-6" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7.5v5M12 16.2h.01" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-bold">{title}</div>
        <div className="mt-1 text-sm text-inherit opacity-[.92]">{message}</div>
        {detail && (
          <details className="mt-2.5 text-meta">
            <summary className="cursor-pointer font-semibold opacity-[.85]">Technical details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-field bg-black/5 px-3 py-2.5 font-mono text-xs">{detail}</pre>
          </details>
        )}
        {onRetry && (
          <button
            type="button"
            className="mt-3 min-h-10 w-auto cursor-pointer rounded-field border border-current bg-white/70 px-4 py-2.25 text-base font-semibold text-inherit transition duration-150 ease-out hover:border-ink-3 active:scale-[.98] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
