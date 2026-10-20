import { passwordStrengthError } from "@/lib/password-policy";

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

export { friendlyAuthError } from "@/lib/friendly-auth-error";
