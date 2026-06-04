import { type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // persist sign-in across tablet sleeps/reloads
  },
};

// Files.ReadWrite covers the user's own OneDrive files; User.Read for the profile chip.
export const loginRequest = { scopes: ["User.Read", "Files.ReadWrite"] };
