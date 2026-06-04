/** A success toast that slides up from the bottom with a checkmark. */
export function Toast({ message, product }: { message: string; product?: string }) {
  return (
    <div className="toast-wrap">
      <div className="toast" role="status">
        <span className="toast__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
        <span>{message}</span>
        {product && <span className="toast__product">{product}</span>}
      </div>
    </div>
  );
}
