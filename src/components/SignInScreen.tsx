import { BrandMark } from "./BrandMark";

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="relative z-1 grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-110 rounded-card border border-line bg-surface px-9 py-11 text-center shadow-pop motion-safe:animate-[rise_.5s_ease_.12s_both]">
        <div className="brand-tile mx-auto mb-6 grid size-18 place-items-center rounded-tile-lg shadow-tile-lg">
          <BrandMark size={42} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-display">Welcome to TrueHugz</h1>
        <p className="mt-3 mb-7 text-base leading-normal text-ink-2">
          Log stock takes and top-ups across your branches — calm, quick, and always in sync.
        </p>
        <button
          type="button"
          className="w-full cursor-pointer rounded-field border border-accent bg-accent p-4.5 text-lg font-bold text-white shadow-cta transition duration-150 ease-out hover:border-accent-2 hover:bg-accent-2 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
          onClick={onSignIn}
        >
          Sign in with Microsoft
        </button>
        <div className="mt-5.5 font-mono text-tag uppercase tracking-caps text-ink-3">Inventory Log</div>
      </div>
    </div>
  );
}
