import { passwordStrengthError } from "@/lib/password-policy";

function invalidWhenPresent(
  value: string,
  invalid: (parsed: number) => boolean,
  message: string,
): string | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || invalid(parsed)) {
    return message;
  }
  return null;
}

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountEmailUpdateError(email: string): string | null {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizeAccountEmail(email))) {
    return "Please enter a valid new email address.";
  }
  return null;
}

export const ACCOUNT_EMAIL_UNAVAILABLE = "Could not verify current user email. Please log in again.";
export const CURRENT_PASSWORD_REQUIRED = "Please enter your current password.";
export const CURRENT_PASSWORD_INCORRECT = "Current password is incorrect.";

export function accountPasswordUpdateError(input: {
  userEmail: string | null;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  /** False for Google/Apple accounts that have not set a password yet. */
  hasPassword?: boolean;
}): string | null {
  if (!input.userEmail) {
    return ACCOUNT_EMAIL_UNAVAILABLE;
  }
  if (input.hasPassword !== false && !input.currentPassword) {
    return CURRENT_PASSWORD_REQUIRED;
  }
  const strengthError = passwordStrengthError(
    input.newPassword,
    input.hasPassword === false ? "Password" : "New password",
  );
  if (strengthError) {
    return strengthError;
  }
  if (input.newPassword !== input.confirmNewPassword) {
    return input.hasPassword === false
      ? "Passwords do not match."
      : "New password and confirmation do not match.";
  }
  return null;
}

/** First password on an account that signed in with Google or Apple. */
export function accountPasswordSetError(input: {
  newPassword: string;
  confirmNewPassword: string;
}): string | null {
  return accountPasswordUpdateError({
    userEmail: "set-password@local",
    currentPassword: "",
    newPassword: input.newPassword,
    confirmNewPassword: input.confirmNewPassword,
    hasPassword: false,
  });
}

export function accountDeleteError(input: {
  userEmail: string | null;
  currentPassword: string;
  /** False when the account has no email/password identity. */
  hasPassword?: boolean;
}): string | null {
  if (!input.userEmail) {
    return ACCOUNT_EMAIL_UNAVAILABLE;
  }
  if (input.hasPassword !== false && !input.currentPassword) {
    return CURRENT_PASSWORD_REQUIRED;
  }
  return null;
}

export const MAX_WARMUP_SETS_INVALID = "Please enter a valid maximum number of warmup sets.";

/** Empty keeps the full ladder. A whole number of 1 or more is a cap. */
export function maxWarmupSetsSaveError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return MAX_WARMUP_SETS_INVALID;
  }
  return null;
}

/** Null when the field is empty. Call only after maxWarmupSetsSaveError returns null. */
export function parseMaxWarmupSets(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return Number(trimmed);
}

export function exerciseDefaultsSaveError(input: {
  userId: string | null;
  exerciseId: string;
  baseWeightKg: string;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  maxWarmupSets: string;
}): string | null {
  if (!input.userId) {
    return "Please log in again to save defaults.";
  }
  if (!input.exerciseId) {
    return "Please select an exercise.";
  }
  const maxWarmupSetsError = maxWarmupSetsSaveError(input.maxWarmupSets);
  if (maxWarmupSetsError) {
    return maxWarmupSetsError;
  }
  return (
    invalidWhenPresent(
      input.baseWeightKg,
      (value) => value < 0,
      "Please enter a valid base weight.",
    ) ??
    invalidWhenPresent(
      input.targetSets,
      (value) => value <= 0,
      "Please enter a valid number of target working sets.",
    ) ??
    invalidWhenPresent(
      input.targetReps,
      (value) => value <= 0,
      "Please enter a valid target reps value for working sets.",
    ) ??
    invalidWhenPresent(
      input.targetWeightKg,
      (value) => value < 0,
      "Please enter a valid target weight (kg) for working sets.",
    )
  );
}

export function exerciseDefaultsClearError(
  userId: string | null,
  exerciseId: string,
): string | null {
  if (!userId) {
    return "Please log in again to clear defaults.";
  }
  if (!exerciseId) {
    return "Please select an exercise first.";
  }
  return null;
}
