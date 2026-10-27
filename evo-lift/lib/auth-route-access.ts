/**
 * Session gate for the UI proxy.
 * Paths under `/app` require a verified user. `/api/*` stays open for bearer auth.
 * `/`, `/login`, `/privacy`, `/terms`, `/legal`, and `/glossary` stay public at the site root.
 * A signed-in visitor on `/` goes to `/app`.
 */

import { isAuthEmailRecoverySearch } from "@/lib/auth-email-redirect";
import { APP_HOME_PATH } from "@/lib/app-paths";

/** Site-root pages that stay open without a session. Search indexing uses this list. */
export const PUBLIC_PAGE_PATHS = ["/", "/login", "/privacy", "/terms", "/legal", "/glossary"] as const;

const PUBLIC_EXACT = new Set<string>(PUBLIC_PAGE_PATHS);

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

export type SessionGateDecision = "allow" | "redirect_login" | "redirect_home" | "redirect_mfa";

/** Pure gate used by the Next.js proxy after `getUser()`. */
export function sessionGateDecision(input: {
  pathname: string;
  hasUser: boolean;
  search?: string | URLSearchParams | null;
  /**
   * True when this session has a verified authenticator and is still below AAL2.
   * Does not mean the account must enroll. Accounts without a factor stay false.
   */
  needsAuthenticatorChallenge?: boolean;
}): SessionGateDecision {
  if (
    input.hasUser &&
    input.pathname === "/login" &&
    isAuthEmailRecoverySearch(input.search)
  ) {
    return "allow";
  }
  if (input.hasUser && input.needsAuthenticatorChallenge) {
    if (input.pathname === "/" || requiresAppSession(input.pathname)) {
      return "redirect_mfa";
    }
    if (input.pathname === "/login") {
      return "allow";
    }
  }
  if (input.pathname === "/" && input.hasUser) {
    return "redirect_home";
  }
  if (!input.hasUser && requiresAppSession(input.pathname)) {
    return "redirect_login";
  }
  if (input.hasUser && input.pathname === "/login") {
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
  if (decision === "redirect_mfa") {
    return "/login?mfa=1";
  }
  return null;
}
