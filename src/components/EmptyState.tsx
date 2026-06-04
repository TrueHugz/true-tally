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
    <div className="px-5 py-10 text-center text-ink-3">
      <div className="mx-auto mb-3.5 grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-ink-3 [&_svg]:size-7">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
            <path d="M4 7l8 4 8-4M12 11v10" />
          </svg>
        )}
      </div>
      <div className="font-display text-control font-semibold text-ink-2">{title}</div>
      <p className="mx-auto mt-1.5 max-w-80 text-sm">{message}</p>
    </div>
  );
}
