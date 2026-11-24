import type { NextRequest } from "next/server";
import { SESSION_TOKEN_HEADER } from "@/lib/session-token-header";

export function getBearerCredential(request: NextRequest): string | undefined {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return undefined;
  }

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || rest.length === 0) {
    return undefined;
  }

  const token = rest.join(" ").replace(/^Bearer\s+/i, "").trim();
  return token || undefined;
}

export function credentialFromRequest(request: NextRequest): string | undefined {
  const bearer = getBearerCredential(request);
  if (bearer) {
    return bearer;
  }
  const sessionHeader = request.headers.get(SESSION_TOKEN_HEADER)?.trim();
  return sessionHeader || undefined;
}

/** A browser fetch from the app. Cross-site requests do not get the cookie session. */
export function sameOriginBrowserRequest(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}
