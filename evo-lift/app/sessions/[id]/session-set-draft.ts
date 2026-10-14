export type SessionSetDraft = {
  reps: string;
  weightKg: string;
  isWarmup: boolean;
};

export type SessionWorkingSet = {
  is_warmup: boolean;
  reps: number;
  weight_kg: number | null;
};

export type SessionExerciseTargets = {
  target_reps: number | null;
  target_weight_kg: number | null;
};

export const SESSION_DATE_REQUIRED = "Please choose a performed date.";
export const SESSION_DATE_INVALID = "Please enter a valid performed date (YYYY-MM-DD).";
export const SESSION_DATE_HAS_SETS =
  "This session already has logged sets. Choose today or an earlier date.";

/** Validates `YYYY-MM-DD` and the calendar day (for example, rejects 2024-02-31). */
export function parseYyyyMmDdDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const constructed = new Date(year, month - 1, day);
  if (
    constructed.getFullYear() !== year ||
    constructed.getMonth() !== month - 1 ||
    constructed.getDate() !== day
  ) {
    return null;
  }
  return trimmed;
}

export function sessionPerformedOnError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return SESSION_DATE_REQUIRED;
  }
  if (!parseYyyyMmDdDateOnly(trimmed)) {
    return SESSION_DATE_INVALID;
  }
  return null;
}

/** Most recent working (non-warmup) set in `set_number` order. */
export function findLastWorkingSet<T extends { is_warmup: boolean }>(setsSorted: T[]): T | null {
  for (let i = setsSorted.length - 1; i >= 0; i -= 1) {
    const row = setsSorted[i];
    if (row && !row.is_warmup) {
      return row;
    }
  }
  return null;
}

/** Session exercise targets only; omit fields not set on the row. */
export function targetPrefillStringsFromSessionExercise(sessionExercise: SessionExerciseTargets): {
  reps: string;
  weightKg: string;
} {
  const reps =
    sessionExercise.target_reps != null &&
    sessionExercise.target_reps > 0 &&
    Number.isFinite(sessionExercise.target_reps)
      ? String(sessionExercise.target_reps)
      : "";
  const weightKg =
    sessionExercise.target_weight_kg != null &&
    Number.isFinite(Number(sessionExercise.target_weight_kg))
      ? String(sessionExercise.target_weight_kg)
      : "";
  return { reps, weightKg };
}

/**
 * Add-set defaults: targets when no working set exists yet; otherwise the last working set.
 * Warmup rows never supply weight or reps. `partialDraft` keeps an in-progress edit.
 */
export function resolveSuggestedAddDraft(
  sessionExercise: SessionExerciseTargets | undefined,
  setsSorted: SessionWorkingSet[],
  partialDraft: Partial<SessionSetDraft> | undefined,
): SessionSetDraft {
  const lastWorking = findLastWorkingSet(setsSorted);
  const targets = sessionExercise
    ? targetPrefillStringsFromSessionExercise(sessionExercise)
    : { reps: "", weightKg: "" };

  const reps =
    partialDraft?.reps !== undefined
      ? partialDraft.reps
      : lastWorking
        ? String(lastWorking.reps)
        : targets.reps;
  const weightKg =
    partialDraft?.weightKg !== undefined
      ? partialDraft.weightKg
      : lastWorking
        ? lastWorking.weight_kg == null
          ? ""
          : String(lastWorking.weight_kg)
        : targets.weightKg;
  const isWarmup = partialDraft?.isWarmup !== undefined ? partialDraft.isWarmup : false;

  return { reps, weightKg, isWarmup };
}
