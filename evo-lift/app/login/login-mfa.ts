import {
  authenticatorAssuranceLevelFromJwt,
  hasVerifiedAuthenticator,
  type MfaFactorLike,
} from "@/lib/mfa-assurance";

/** After password sign-in, challenge only when a verified authenticator is already enrolled. */
export function loginNeedsAuthenticatorChallenge(input: {
  accessToken: string | null | undefined;
  factors: readonly MfaFactorLike[] | null | undefined;
}): boolean {
  if (!input.accessToken) {
    return false;
  }
  return hasVerifiedAuthenticator(input.factors) && authenticatorAssuranceLevelFromJwt(input.accessToken) !== "aal2";
}
