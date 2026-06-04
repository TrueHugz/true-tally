import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./auth/msalConfig";
import App from "./App";
import "./index.css";

const msal = new PublicClientApplication(msalConfig);

async function bootstrap() {
  await msal.initialize();

  // Process a returning redirect, if any.
  const result = await msal.handleRedirectPromise();
  if (result?.account) {
    msal.setActiveAccount(result.account);
  } else if (!msal.getActiveAccount() && msal.getAllAccounts().length > 0) {
    msal.setActiveAccount(msal.getAllAccounts()[0]);
  }

  // Keep the active account in sync after future logins.
  msal.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload && "account" in event.payload) {
      msal.setActiveAccount((event.payload as { account: never }).account);
    }
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App msal={msal} />
    </StrictMode>,
  );
}

bootstrap();
