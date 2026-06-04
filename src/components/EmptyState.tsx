import type { ReactNode } from "react";

/** A centered, muted, tasteful empty state. */
export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
            <path d="M4 7l8 4 8-4M12 11v10" />
          </svg>
        )}
      </div>
      <div className="empty__title">{title}</div>
      <p className="empty__msg">{message}</p>
    </div>
  );
}
