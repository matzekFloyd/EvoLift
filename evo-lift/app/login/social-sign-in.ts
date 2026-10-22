import type { Provider } from "@supabase/supabase-js";

export const SOCIAL_SIGN_IN_PROVIDERS = [
  { provider: "google", label: "Sign in with Google" },
  { provider: "apple", label: "Sign in with Apple" },
] as const satisfies readonly { provider: Provider; label: string }[];

export type SocialSignInProvider = (typeof SOCIAL_SIGN_IN_PROVIDERS)[number]["provider"];

export const SOCIAL_SIGN_IN_LINKING_COPY =
  "If that email already has an EvoLift account, you log in to that account.";

export type OAuthLoginNotice = "cancelled" | "email_taken" | "failed";

const OAUTH_LOGIN_NOTICES: Record<OAuthLoginNotice, string> = {
  cancelled: "Sign-in was cancelled.",
  email_taken: "This email already has an EvoLift account. Log in with email and password.",
  failed: "Could not sign in with Google or Apple. Try again, or use email and password.",
};

/** Login-panel copy for our own `oauth` query. Anything else is ignored. */
export function oauthLoginNotice(value: string | null | undefined): string | null {
  if (value === "cancelled" || value === "email_taken" || value === "failed") {
    return OAUTH_LOGIN_NOTICES[value];
  }
  return null;
}

export function oauthLoginPath(notice: OAuthLoginNotice): string {
  return `/login?oauth=${notice}`;
}

export type OAuthCallbackDecision =
  | { action: "exchange"; code: string; flowId: string | null }
  | { action: "login"; notice: OAuthLoginNotice };

const EMAIL_TAKEN_CODES = new Set([
  "identity_already_exists",
  "email_exists",
  "user_already_exists",
]);

/**
 * Decide the OAuth return without forwarding provider text.
 * A code is exchanged. Every other return becomes one of three login notices.
 */
export function oauthCallbackDecision(search: URLSearchParams): OAuthCallbackDecision {
  const code = search.get("code")?.trim() ?? "";
  if (code) {
    const flowId = search.get("sb_flow_id")?.trim() || null;
    return { action: "exchange", code, flowId };
  }

  const error = (search.get("error") ?? "").toLowerCase();
  const errorCode = (search.get("error_code") ?? "").toLowerCase();
  const description = (search.get("error_description") ?? "").toLowerCase();

  if (error === "access_denied" || errorCode === "access_denied") {
    return { action: "login", notice: "cancelled" };
  }

  if (
    EMAIL_TAKEN_CODES.has(errorCode) ||
    description.includes("already registered") ||
    description.includes("already been registered") ||
    description.includes("already linked") ||
    description.includes("email address has already")
  ) {
    return { action: "login", notice: "email_taken" };
  }

  return { action: "login", notice: "failed" };
}

/** Providers Auth reports as enabled. Unknown or failed settings yield none. */
export function socialProvidersFromAuthSettings(body: unknown): SocialSignInProvider[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const external = (body as { external?: unknown }).external;
  if (!external || typeof external !== "object") {
    return [];
  }
  const flags = external as Record<string, unknown>;
  return SOCIAL_SIGN_IN_PROVIDERS.map((item) => item.provider).filter(
    (provider) => flags[provider] === true,
  );
}

/**
 * Copy when this provider cannot start, or null when Auth says it is enabled.
 * A missing settings payload is treated as unavailable so the panel does not
 * leave EvoLift for a raw provider error.
 */
export function socialSignInBlockedMessage(
  settings: unknown,
  provider: SocialSignInProvider,
): string | null {
  if (socialProvidersFromAuthSettings(settings).includes(provider)) {
    return null;
  }
  return friendlyOAuthError("provider is not enabled", provider);
}

export async function loadSocialAuthSettings(input: {
  supabaseUrl: string | null | undefined;
  anonKey: string | null | undefined;
  fetchImpl?: typeof fetch;
}): Promise<unknown> {
  const url = input.supabaseUrl?.trim();
  const key = input.anonKey?.trim();
  if (!url || !key) {
    return null;
  }
  const base = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  try {
    const response = await (input.fetchImpl ?? fetch)(`${base}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function providerName(provider: SocialSignInProvider): string {
  return provider === "google" ? "Google" : "Apple";
}

/**
 * Map a Supabase OAuth start failure to panel copy.
 * Never return the raw provider string.
 */
export function friendlyOAuthError(rawMessage: string, provider: SocialSignInProvider): string {
  const messageLower = rawMessage.toLowerCase();
  const name = providerName(provider);

  if (
    messageLower.includes("not enabled") ||
    messageLower.includes("unsupported provider") ||
    messageLower.includes("provider is not enabled")
  ) {
    return `${name} sign-in is not available right now. Use email and password.`;
  }

  if (
    messageLower.includes("rate limit") ||
    messageLower.includes("over_request_rate_limit") ||
    messageLower.includes("too many requests")
  ) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }

  return `Could not sign in with ${name}. Try again, or use email and password.`;
}
