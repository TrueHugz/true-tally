import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { loginRequest } from "./msalConfig";

/** Returns a Graph access token, falling back to an interactive redirect when needed. */
export async function getAccessToken(msal: PublicClientApplication): Promise<string> {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) throw new Error("No signed-in account");
  try {
    const res = await msal.acquireTokenSilent({ ...loginRequest, account });
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ ...loginRequest, account });
    }
    throw e;
  }
}
