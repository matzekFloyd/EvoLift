/**
 * Which app paths the session proxy leaves open without a verified user.
 * `/api/*` stays open here so bearer/personal-token API auth is unchanged.
 */

import { isAuthEmailRecoverySearch } from "@/lib/auth-email-redirect";

const PUBLIC_EXACT = new Set([
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

/** Paths that require a verified session cookie (defense-in-depth for the UI shell). */
export function requiresAppSession(pathname: string): boolean {
  return !isPublicAppPath(pathname);
}

export type SessionGateDecision = "allow" | "redirect_login" | "redirect_home";

/** Pure gate used by the Next.js proxy after `getUser()`. */
export function sessionGateDecision(input: {
  pathname: string;
  hasUser: boolean;
  search?: string | URLSearchParams | null;
}): SessionGateDecision {
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
