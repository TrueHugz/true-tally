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
  return (
    <div className={`banner ${tone}`} role="alert">
      <span className="banner__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7.5v5M12 16.2h.01" />
        </svg>
      </span>
      <div className="banner__body">
        <div className="banner__title">{title}</div>
        <div className="banner__msg">{message}</div>
        {detail && (
          <details className="banner__details">
            <summary>Technical details</summary>
            <pre>{detail}</pre>
          </details>
        )}
        {onRetry && (
          <button type="button" className="banner__retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
