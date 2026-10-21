import { passwordStrengthError } from "@/lib/password-policy";

export type LoginPanelMode = "login" | "register" | "forgot" | "reset";

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function loginEmailError(normalizedEmail: string): string | null {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function loginPasswordError(input: {
  password: string;
  confirmPassword: string;
  mode: "login" | "register";
}): string | null {
  if (input.mode === "login") {
    if (!input.password) {
      return "Please enter your password.";
    }
    return null;
  }
  const strengthError = passwordStrengthError(input.password);
  if (strengthError) {
    return strengthError;
  }
  if (input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

/** Validation for the post-email recovery form (new password + confirm). */
export function loginResetPasswordError(input: {
  password: string;
  confirmPassword: string;
}): string | null {
  const strengthError = passwordStrengthError(input.password, "New password");
  if (strengthError) {
    return strengthError;
  }
  if (input.password !== input.confirmPassword) {
    return "New password and confirmation do not match.";
  }
  return null;
}

export { friendlyAuthError } from "@/lib/friendly-auth-error";
