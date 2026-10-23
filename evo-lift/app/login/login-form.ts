import { passwordStrengthError } from "@/lib/password-policy";

export type LoginPanelMode = "login" | "register" | "forgot" | "reset";

export type LoginSubmitAction = LoginPanelMode | "mfa";

/** Which control is in flight. Social sign-in keeps its own label. */
export type LoginPending = LoginSubmitAction | "social" | null;

const LOGIN_SUBMIT_IDLE_LABEL: Record<LoginSubmitAction, string> = {
  login: "Log in",
  register: "Register",
  forgot: "Send reset link",
  reset: "Set new password",
  mfa: "Verify",
};

const LOGIN_SUBMIT_BUSY_LABEL: Record<LoginSubmitAction, string> = {
  login: "Logging in…",
  register: "Registering…",
  forgot: "Sending reset link…",
  reset: "Setting new password…",
  mfa: "Verifying…",
};

/**
 * Busy label for the control that was submitted. A tab change while the request
 * runs keeps that label. Social sign-in does not relabel the email form.
 */
export function loginControlLabel(control: LoginSubmitAction, pending: LoginPending): string {
  if (control === "mfa") {
    return pending === "mfa" ? LOGIN_SUBMIT_BUSY_LABEL.mfa : LOGIN_SUBMIT_IDLE_LABEL.mfa;
  }
  if (pending === "login" || pending === "register" || pending === "forgot" || pending === "reset") {
    return LOGIN_SUBMIT_BUSY_LABEL[pending];
  }
  return LOGIN_SUBMIT_IDLE_LABEL[control];
}

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
