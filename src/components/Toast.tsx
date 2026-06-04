/** A success toast that slides up from the bottom with a checkmark. */
export function Toast({ message, product }: { message: string; product?: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-100 flex justify-center">
      <div className="pointer-events-auto inline-flex max-w-[calc(100vw-32px)] items-center gap-2.75 rounded-pill bg-ink px-5 py-3.5 text-note font-semibold text-white shadow-pop motion-safe:animate-[slide-up-toast_.28s_cubic-bezier(.2,.8,.2,1)]" role="status">
        <span className="grid size-5.5 flex-none place-items-center rounded-pill bg-accent [&_svg]:block [&_svg]:size-3.25" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
        <span>{message}</span>
        {product && <span className="font-mono font-medium opacity-[.9]">{product}</span>}
      </div>
    </div>
  );
}
