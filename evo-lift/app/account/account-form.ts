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

export function accountPasswordUpdateError(input: {
  userEmail: string | null;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): string | null {
  if (!input.userEmail) {
    return "Could not verify current user email. Please log in again.";
  }
  if (!input.currentPassword) {
    return "Please enter your current password.";
  }
  if (input.newPassword.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (!/[a-zA-Z]/.test(input.newPassword) || !/[0-9]/.test(input.newPassword)) {
    return "New password must include at least one letter and one number.";
  }
  if (input.newPassword !== input.confirmNewPassword) {
    return "New password and confirmation do not match.";
  }
  return null;
}

export function exerciseDefaultsSaveError(input: {
  userId: string | null;
  exerciseId: string;
  baseWeightKg: string;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
}): string | null {
  if (!input.userId) {
    return "Please log in again to save defaults.";
  }
  if (!input.exerciseId) {
    return "Please select an exercise.";
  }
  return (
    invalidWhenPresent(
      input.baseWeightKg,
      (value) => value < 0,
      "Please enter a valid default base weight.",
    ) ??
    invalidWhenPresent(
      input.targetSets,
      (value) => value <= 0,
      "Please enter a valid default number of target working sets.",
    ) ??
    invalidWhenPresent(
      input.targetReps,
      (value) => value <= 0,
      "Please enter a valid default target reps value for working sets.",
    ) ??
    invalidWhenPresent(
      input.targetWeightKg,
      (value) => value < 0,
      "Please enter a valid default target weight (kg) for working sets.",
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
