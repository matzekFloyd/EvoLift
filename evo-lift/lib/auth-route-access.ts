/**
 * Session gate for the UI proxy.
 * Paths under `/app` require a verified user. `/api/*` stays open for bearer auth.
 * `/`, `/login`, `/privacy`, `/terms`, and `/glossary` stay public at the site root.
 * A signed-in visitor on `/` goes to `/app`.
 */

import { isAuthEmailRecoverySearch } from "@/lib/auth-email-redirect";
import { APP_HOME_PATH } from "@/lib/app-paths";

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/glossary",
]);

export function isPublicAppPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  if (pathname.startsWith("/api/")) {
    return true;
  }
  return false;
}

/** A path under `/app`, including Home. `/apple` and `/application` do not match. */
export function requiresAppSession(pathname: string): boolean {
  return pathname === APP_HOME_PATH || pathname.startsWith(`${APP_HOME_PATH}/`);
}

export type SessionGateDecision = "allow" | "redirect_login" | "redirect_home";

/** Pure gate used by the Next.js proxy after `getUser()`. */
export function sessionGateDecision(input: {
  pathname: string;
  hasUser: boolean;
  search?: string | URLSearchParams | null;
}): SessionGateDecision {
  if (input.pathname === "/" && input.hasUser) {
    return "redirect_home";
  }
  if (!input.hasUser && requiresAppSession(input.pathname)) {
    return "redirect_login";
  }
  if (input.hasUser && input.pathname === "/login") {
    // Recovery email lands with a session; keep `/login?recovery=1` so the user can set a password.
    if (isAuthEmailRecoverySearch(input.search)) {
      return "allow";
    }
    return "redirect_home";
  }
  return "allow";
}

/** Where the proxy sends `redirect_login` and `redirect_home`. `allow` has no redirect. */
export function sessionGateRedirectPath(decision: SessionGateDecision): string | null {
  if (decision === "redirect_login") {
    return "/login";
  }
  if (decision === "redirect_home") {
    return APP_HOME_PATH;
  }
  return null;
}
