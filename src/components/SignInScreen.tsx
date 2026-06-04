import { BrandMark } from "./BrandMark";

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="relative z-[1] grid min-h-[100dvh] place-items-center p-[24px]">
      <div className="w-full max-w-[440px] rounded-card border border-line bg-surface px-[36px] py-[44px] text-center shadow-pop motion-safe:animate-[rise_.5s_ease_.12s_both]">
        <div className="mx-auto mb-[24px] grid size-[72px] place-items-center rounded-[20px] bg-[linear-gradient(150deg,var(--color-accent)_0%,var(--color-accent-2)_100%)] shadow-[0_16px_40px_-16px_rgba(14,124,102,.8),inset_0_1px_0_rgba(255,255,255,.25)]">
          <BrandMark size={42} />
        </div>
        <h1 className="font-display text-[30px] font-bold tracking-[-.02em]">Welcome to TrueHugz</h1>
        <p className="mt-[12px] mb-[28px] text-[16px] leading-[1.5] text-ink-2">
          Log stock takes and top-ups across your branches — calm, quick, and always in sync.
        </p>
        <button
          type="button"
          className="w-full cursor-pointer rounded-field border border-accent bg-accent p-[18px] text-[18px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(14,124,102,.65)] [transition:background-color_.15s_ease,border-color_.15s_ease,color_.15s_ease,box-shadow_.15s_ease,transform_.08s_ease] hover:border-accent-2 hover:bg-accent-2 active:scale-[.98] focus-visible:shadow-[0_0_0_4px_var(--color-accent-soft),0_12px_26px_-12px_rgba(14,124,102,.65)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
          onClick={onSignIn}
        >
          Sign in with Microsoft
        </button>
        <div className="mt-[22px] font-mono text-[11px] uppercase tracking-[.12em] text-ink-3">Inventory Log</div>
      </div>
    </div>
  );
}
