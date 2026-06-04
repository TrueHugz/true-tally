/**
 * TrueHugz brand glyph — a softened, protective droplet/shield evoking
 * cool care. Drawn on a transparent ground so it can sit inside the jade
 * gradient tile defined in CSS.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      {/* Outer protective droplet/shield */}
      <path
        d="M16 2.5c5.4 4.8 9 8.7 9 14.1A9 9 0 0 1 16 25.6 9 9 0 0 1 7 16.6C7 11.2 10.6 7.3 16 2.5Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      {/* Inner cradle — a gentle "hug" curve */}
      <path
        d="M11 16.6c0 2.9 2.3 5 5 5s5-2.1 5-5"
        stroke="#0E7C66"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Soft heart-care notch */}
      <path
        d="M16 11.4c1-1.4 3.4-1.2 3.4.7 0 1.5-2 3-3.4 4-1.4-1-3.4-2.5-3.4-4 0-1.9 2.4-2.1 3.4-.7Z"
        fill="#0E7C66"
      />
    </svg>
  );
}
