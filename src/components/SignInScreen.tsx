import { BrandMark } from "./BrandMark";

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="signin">
      <div className="signin__card stagger-card">
        <div className="signin__mark">
          <BrandMark size={42} />
        </div>
        <h1 className="signin__title">Welcome to TrueHugz</h1>
        <p className="signin__sub">
          Log stock takes and top-ups across your branches — calm, quick, and always in sync.
        </p>
        <button type="button" className="primary signin__btn" onClick={onSignIn}>
          Sign in with Microsoft
        </button>
        <div className="signin__foot">Inventory Log</div>
      </div>
    </div>
  );
}
