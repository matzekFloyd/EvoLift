/**
 * Map Supabase Auth (and similar) errors to brand-safe user copy.
 * Never return the raw provider string — it can leak internals.
 */
export function friendlyAuthError(
  rawMessage: string,
  context: "login" | "register" | "account" = "login",
): string {
  const messageLower = rawMessage.toLowerCase();

  if (
    messageLower.includes("user already registered") ||
    messageLower.includes("already been registered") ||
    messageLower.includes("already registered")
  ) {
    return "This email is already registered. Try logging in instead.";
  }
  if (messageLower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (
    messageLower.includes("email not confirmed") ||
    messageLower.includes("email_not_confirmed")
  ) {
    return "Confirm your email first, then try logging in.";
  }
  if (
    messageLower.includes("rate limit") ||
    messageLower.includes("over_request_rate_limit") ||
    messageLower.includes("too many requests")
  ) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  if (
    messageLower.includes("password") &&
    (messageLower.includes("weak") ||
      messageLower.includes("least") ||
      messageLower.includes("characters") ||
      messageLower.includes("should contain") ||
      messageLower.includes("requirements"))
  ) {
    return context === "account"
      ? "New password must be at least 8 characters and include a letter and a number."
      : "Password must be at least 8 characters and include a letter and a number.";
  }
  if (messageLower.includes("same password") || messageLower.includes("should be different")) {
    return "New password must be different from the current password.";
  }
  if (
    messageLower.includes("email") &&
    (messageLower.includes("invalid") || messageLower.includes("unable to validate"))
  ) {
    return context === "account"
      ? "Please enter a valid new email address."
      : "Please enter a valid email address.";
  }

  if (context === "register") {
    return "Could not create the account. Please try again.";
  }
  if (context === "account") {
    return "Could not update account settings. Please try again.";
  }
  return "Could not sign in. Check your email and password, then try again.";
}
