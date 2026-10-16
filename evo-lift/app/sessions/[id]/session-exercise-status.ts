export const SKIPPED_EXERCISE_BUTTON_TITLE =
  "You did not do this exercise. Tap again to clear.";

export function skippedExerciseLabel(skipped: boolean): "Skip" | "Skipped" {
  return skipped ? "Skipped" : "Skip";
}

export function skippedExerciseButtonClass(skipped: boolean): string {
  if (skipped) {
    return "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100";
  }
  return "border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-amber-300 hover:bg-zinc-100";
}

export const skippedExerciseChipClass =
  "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900";

/** Logged sets stay on a skipped exercise. The cover blocks the controls. */
export function setsToShowForSkippedExercise<T extends { is_warmup: boolean }>(
  sets: readonly T[],
  skipped: boolean,
): T[] {
  if (skipped) {
    return [...sets];
  }
  return [...sets];
}

export function showSessionExerciseTargetsMet(input: {
  workingSetCount: number;
  targetSets: number | null;
  notDone: boolean;
}): boolean {
  if (input.notDone) {
    return false;
  }
  return input.targetSets != null && input.targetSets > 0 && input.workingSetCount >= input.targetSets;
}
