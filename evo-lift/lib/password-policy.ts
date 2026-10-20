/** Minimum length enforced in-app and in Supabase Auth (`minimum_password_length`). */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Shared strength rules for register and password change.
 * Keep aligned with `supabase/config.toml` (`minimum_password_length`, `password_requirements = "letters_digits"`)
 * and hosted Authentication → Providers → Email password settings.
 */
export function passwordStrengthError(
  password: string,
  label: "Password" | "New password" = "Password",
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `${label} must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return `${label} must include at least one letter and one number.`;
  }
  return null;
}
