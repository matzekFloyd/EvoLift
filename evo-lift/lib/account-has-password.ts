/**
 * True when the account has an email/password identity.
 * Unknown identities fail closed (treat as a password account) so a missing
 * payload cannot skip the current-password check.
 * An empty list, or only Google/Apple, means there is no password yet.
 */
export function accountHasEmailPassword(
  identities: readonly { provider?: string | null }[] | null | undefined,
): boolean {
  if (identities == null) {
    return true;
  }
  return identities.some((identity) => identity.provider === "email");
}
