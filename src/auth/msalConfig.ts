import { type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    // BASE_URL is "/" in dev and "/true-tally/" on GitHub Pages, so the
    // redirect returns to the running app rather than the host root.
    redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
    postLogoutRedirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
  },
  cache: {
    cacheLocation: "localStorage", // persist sign-in across tablet sleeps/reloads
  },
};

// Files.ReadWrite covers the user's own OneDrive files; User.Read for the profile chip.
export const loginRequest = { scopes: ["User.Read", "Files.ReadWrite"] };
