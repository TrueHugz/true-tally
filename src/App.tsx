import type { PublicClientApplication } from "@azure/msal-browser";

export default function App({ msal }: { msal: PublicClientApplication }) {
  void msal;
  return <div>TrueHugz Inventory Log</div>;
}
