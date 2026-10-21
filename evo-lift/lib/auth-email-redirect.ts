/** Path after email confirmation (sign-up or email change). */
export const AUTH_EMAIL_VERIFIED_PATH = "/login?verified=1";

/** Path after password-recovery email; keeps `/login` open while the recovery session is active. */
export const AUTH_EMAIL_RECOVERY_PATH = "/login?recovery=1";

/**
 * Public origin for auth email redirects.
 * Prefer `NEXT_PUBLIC_APP_URL` in production so confirm links never depend on
 * a misconfigured Supabase Site URL alone. Locally, omit the env var and use
 * the browser origin (`http://localhost:3000`).
 */
export function resolveAppOrigin(input: {
  envAppUrl?: string | null;
  windowOrigin?: string | null;
}): string | null {
  const fromEnv = normalizeOrigin(input.envAppUrl);
  if (fromEnv) {
    return fromEnv;
  }
  return normalizeOrigin(input.windowOrigin);
}

export function authEmailRedirectUrl(input: {
  envAppUrl?: string | null;
  windowOrigin?: string | null;
  path?: string;
}): string | null {
  const origin = resolveAppOrigin(input);
  if (!origin) {
    return null;
  }
  const path = input.path?.trim() || AUTH_EMAIL_VERIFIED_PATH;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

/** True when the login URL is the password-recovery callback (`?recovery=1`). */
export function isAuthEmailRecoverySearch(
  search: string | URLSearchParams | null | undefined,
): boolean {
  if (search == null) {
    return false;
  }
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return params.get("recovery") === "1";
}

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}
