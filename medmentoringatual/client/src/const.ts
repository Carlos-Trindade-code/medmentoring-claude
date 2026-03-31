export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const RETURN_PATH_KEY = "auth_return_path";

// Generate Google OAuth login URL at runtime so redirect URI reflects the current origin.
// Saves the current path to localStorage so we can restore it after OAuth redirect.
export const getLoginUrl = (returnPath?: string) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // Determine the path we want to return to after login
  const path = returnPath ?? window.location.pathname;

  // Only save to localStorage if the path is meaningful (not home)
  // AND don't overwrite an existing specific path with "/"
  if (path && path !== "/") {
    try {
      const existing = localStorage.getItem(RETURN_PATH_KEY);
      // Only overwrite if there's no existing value, or existing is "/"
      if (!existing || existing === "/") {
        localStorage.setItem(RETURN_PATH_KEY, path);
      }
    } catch {
      // localStorage may be blocked in Safari private mode — ignore
    }
  }

  // Also encode it in state for server-side redirect (works when cookies work)
  const statePayload = JSON.stringify({ redirectUri, returnPath: path });
  const state = btoa(statePayload);

  if (!clientId) return "#";

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return url.toString();
};

// After login, check if there's a saved return path and navigate to it
export const consumeReturnPath = (): string | null => {
  try {
    const path = localStorage.getItem(RETURN_PATH_KEY);
    if (path) {
      localStorage.removeItem(RETURN_PATH_KEY);
      return path;
    }
  } catch {
    // localStorage may be blocked in Safari private mode — ignore
  }
  return null;
};

// Peek at the return path without consuming it
export const peekReturnPath = (): string | null => {
  try {
    return localStorage.getItem(RETURN_PATH_KEY);
  } catch {
    return null;
  }
};
