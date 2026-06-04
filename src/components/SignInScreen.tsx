export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="app">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>TrueHugz Inventory Log</h1>
        <p className="muted">Sign in with your Microsoft account to log stock activity.</p>
        <button type="button" className="primary" onClick={onSignIn}>Sign in with Microsoft</button>
      </div>
    </div>
  );
}
