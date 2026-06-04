import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { AuthenticationResult, EventMessage } from "@azure/msal-browser";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { msalConfig } from "./auth/msalConfig";
import { makeQueryClient, persister, CACHE_MAX_AGE, CACHE_SCHEMA_VERSION } from "./queryClient";
import App from "./App";
import "./index.css";

const msal = new PublicClientApplication(msalConfig);
const queryClient = makeQueryClient();

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
  msal.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS) {
      const payload = event.payload as AuthenticationResult;
      if (payload?.account) {
        msal.setActiveAccount(payload.account);
      }
    }
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_SCHEMA_VERSION }}
      >
        <App msal={msal} />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

bootstrap().catch((err) => {
  console.error("MSAL bootstrap failed", err);
  const root = document.getElementById("root");
  if (root) root.textContent = "Failed to start. Please reload.";
});
