/**
 * Structured security audit events (OWASP A09).
 * Log lines are JSON on stdout for Vercel / host log drains.
 * Never include passwords, bearer tokens, or personal API token secrets.
 */

export const SECURITY_LOG_CHANNEL = "security" as const;

export type SecurityEventType =
  | "api_auth_failed"
  | "login_failed"
  | "token_created"
  | "token_revoked"
  | "password_changed"
  | "email_change_requested"
  | "password_verify_failed"
  | "account_deleted"
  | "mfa_challenge_failed"
  | "mfa_enrolled"
  | "mfa_disabled";

export type ApiAuthFailureReason =
  | "missing_bearer"
  | "invalid_personal_token"
  | "invalid_bearer_format"
  | "invalid_session_token"
  | "mfa_required";

export type SecurityEvent = {
  type: SecurityEventType;
  /** Machine-readable outcome when useful. */
  outcome?: "success" | "failure";
  userId?: string;
  /** Short SHA-256 fingerprint of normalized email — not reversible to the address. */
  emailFingerprint?: string;
  emailDomain?: string;
  reason?: ApiAuthFailureReason | string;
  tokenId?: string;
  path?: string;
  method?: string;
};

export type SecurityLogRecord = SecurityEvent & {
  channel: typeof SECURITY_LOG_CHANNEL;
  ts: string;
};

const SECRET_KEY_RE =
  /^(password|currentPassword|current_password|newPassword|new_password|token|accessToken|access_token|authorization|bearer|secret|code|otp|totp|factorId|factor_id)$/i;

/** Strip any accidental secret-looking keys before stringify. */
export function sanitizeSecurityEventFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY_RE.test(key)) {
      continue;
    }
    if (typeof value === "string" && looksLikeSecret(value)) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function looksLikeSecret(value: string): boolean {
  if (value.startsWith("evo_")) return true;
  if (value.startsWith("eyJ") && value.length > 40) return true;
  if (/^Bearer\s+/i.test(value)) return true;
  return false;
}

export function emailDomainFrom(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return undefined;
  return email.slice(at + 1).toLowerCase();
}

/** First 16 hex chars of SHA-256(normalized email). Browser-safe via Web Crypto when needed. */
export async function emailFingerprint(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function classifyApiAuthFailure(errorMessage: string): ApiAuthFailureReason {
  if (/missing bearer/i.test(errorMessage)) return "missing_bearer";
  if (/invalid or revoked personal/i.test(errorMessage)) return "invalid_personal_token";
  if (/authenticator code/i.test(errorMessage)) return "mfa_required";
  if (/invalid or expired session/i.test(errorMessage)) return "invalid_session_token";
  if (/invalid bearer/i.test(errorMessage)) return "invalid_bearer_format";
  return "invalid_bearer_format";
}

export function buildSecurityLogRecord(
  event: SecurityEvent,
  now: Date = new Date(),
): SecurityLogRecord {
  const sanitized = sanitizeSecurityEventFields({ ...event }) as SecurityEvent;
  return {
    channel: SECURITY_LOG_CHANNEL,
    ts: now.toISOString(),
    ...sanitized,
  };
}

export function formatSecurityLogLine(event: SecurityEvent, now?: Date): string {
  return JSON.stringify(buildSecurityLogRecord(event, now));
}
