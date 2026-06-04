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
    <div className="px-[20px] py-[40px] text-center text-ink-3">
      <div className="mx-auto mb-[14px] grid size-[56px] place-items-center rounded-[16px] border border-line bg-surface-2 text-ink-3 [&_svg]:size-7">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
            <path d="M4 7l8 4 8-4M12 11v10" />
          </svg>
        )}
      </div>
      <div className="font-display text-[17px] font-semibold text-ink-2">{title}</div>
      <p className="mx-auto mt-[6px] max-w-[320px] text-[14px]">{message}</p>
    </div>
  );
}
