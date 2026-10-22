/**
 * Optional authenticator-app (TOTP) checks.
 * A verified factor challenges login. No factor does not block the app.
 */

export type MfaFactorLike = {
  id?: string;
  status?: string;
  factor_type?: string;
};

export const MFA_SESSION_REQUIRED = "Sign in with your authenticator code, then try again.";

export const LOST_AUTHENTICATOR_MESSAGE =
  "Lost the authenticator app? Resetting your password does not turn it off. Ask the person who runs EvoLift to turn it off for this account.";

const QR_DATA_PREFIX = "data:image/svg+xml;utf-8,";

export function hasVerifiedAuthenticator(
  factors: readonly MfaFactorLike[] | null | undefined,
): boolean {
  return verifiedTotpFactorId(factors) != null;
}

/** Id of the verified authenticator factor, when the account has one. */
export function verifiedTotpFactorId(
  factors: readonly MfaFactorLike[] | null | undefined,
): string | null {
  const match = factors?.find(
    (factor) =>
      factor.factor_type === "totp" &&
      factor.status === "verified" &&
      typeof factor.id === "string" &&
      factor.id.length > 0,
  );
  return match?.id ?? null;
}

/** Unverified authenticator enrollments left behind when setup is abandoned. */
export function unverifiedTotpFactorIds(
  factors: readonly MfaFactorLike[] | null | undefined,
): string[] {
  if (!factors) {
    return [];
  }
  const ids: string[] = [];
  for (const factor of factors) {
    if (
      factor.factor_type === "totp" &&
      factor.status !== "verified" &&
      typeof factor.id === "string" &&
      factor.id.length > 0
    ) {
      ids.push(factor.id);
    }
  }
  return ids;
}

/**
 * Password (or OAuth) sign-in is not enough when a verified authenticator exists
 * and the session is still below AAL2.
 */
export function needsAuthenticatorChallenge(input: {
  currentLevel: string | null | undefined;
  factors: readonly MfaFactorLike[] | null | undefined;
}): boolean {
  return hasVerifiedAuthenticator(input.factors) && input.currentLevel !== "aal2";
}

export function normalizeAuthenticatorCode(code: string): string {
  return code.replace(/\s+/g, "");
}

export function authenticatorCodeError(code: string): string | null {
  if (!/^\d{6}$/.test(normalizeAuthenticatorCode(code))) {
    return "Enter the 6-digit code from your authenticator app.";
  }
  return null;
}

/** Supabase returns SVG markup. An `<img>` needs a data URL. Existing data URLs pass through. */
export function authenticatorQrSrc(qrCode: string): string {
  const trimmed = qrCode.trim();
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  return `${QR_DATA_PREFIX}${trimmed}`;
}

/** Read the `aal` claim. The caller must already have verified the JWT signature. */
export function authenticatorAssuranceLevelFromJwt(jwt: string): string | null {
  const payload = jwt.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { aal?: unknown };
    return typeof parsed.aal === "string" ? parsed.aal : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
