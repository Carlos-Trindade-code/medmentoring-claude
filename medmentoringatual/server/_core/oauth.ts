import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse the state parameter from the OAuth flow.
 * Supports two formats:
 *   - Legacy: base64(redirectUri) — just the redirect URI string
 *   - New: base64(JSON { redirectUri, returnPath }) — includes return path
 */
function parseState(state: string): { redirectUri: string; returnPath: string } {
  try {
    const decoded = atob(state);
    // Try to parse as JSON first (new format)
    try {
      const parsed = JSON.parse(decoded);
      if (parsed.redirectUri) {
        return {
          redirectUri: parsed.redirectUri,
          returnPath: parsed.returnPath || "/",
        };
      }
    } catch {
      // Not JSON — legacy format: the decoded string is the redirectUri
    }
    // Legacy format: decoded string is just the redirectUri
    return { redirectUri: decoded, returnPath: "/" };
  } catch {
    return { redirectUri: "/api/oauth/callback", returnPath: "/" };
  }
}

export function registerOAuthRoutes(app: Express) {
  /**
   * Step 1: OAuth provider redirects here with code+state.
   *
   * Safari ITP blocks cookies set during cross-site redirects (SameSite=Lax).
   * To work around this, we do NOT set the cookie here. Instead:
   *   1. Exchange code for a short-lived session token
   *   2. Redirect to a same-origin frontend page (/auth/callback) with the token
   *   3. That page calls /api/auth/set-session (same-site request) to set the cookie
   *
   * This two-step approach ensures the cookie is always set in a same-site context.
   */
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // After upsertUser, check if this email is the admin
      if (userInfo.email === ENV.adminEmail) {
        await db.upsertUser({ openId: userInfo.openId, role: "admin" });
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const { returnPath } = parseState(state);
      const safePath = returnPath.startsWith("/") ? returnPath : "/";

      console.log(`[OAuth] Callback success: user=${userInfo.openId}, redirecting via /auth/callback to ${safePath}`);

      // Redirect to a same-origin frontend page that will call /api/auth/set-session
      // This ensures the cookie is set in a same-site context (Safari ITP compatible)
      const callbackUrl = `/auth/callback?token=${encodeURIComponent(sessionToken)}&returnPath=${encodeURIComponent(safePath)}`;
      res.redirect(302, callbackUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  /**
   * Step 2: Frontend page calls this endpoint (same-site) to exchange token for cookie.
   * Since this is a same-site request, Safari ITP allows the cookie to be set.
   * The token was already validated in step 1 (sdk.createSessionToken), so we
   * just set it as a cookie here without re-verifying.
   */
  app.post("/api/auth/set-session", (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };

    if (!token || typeof token !== "string" || token.length < 10) {
      res.status(400).json({ error: "invalid token" });
      return;
    }

    const cookieOptions = getSessionCookieOptions(req);
    console.log(`[OAuth] set-session: secure=${cookieOptions.secure}, sameSite=${cookieOptions.sameSite}, proto=${req.protocol}, x-forwarded-proto=${req.headers["x-forwarded-proto"]}`);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ ok: true });
  });
}
