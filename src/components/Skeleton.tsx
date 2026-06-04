import type { CSSProperties } from "react";

/** A shimmering placeholder block used while data loads. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`skeleton-shimmer relative overflow-hidden rounded-field bg-surface-2 ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
