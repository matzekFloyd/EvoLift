/**
 * Compact log after one set is saved.
 * The set that reaches the target hides the add-set composer so Next exercise or Finish can fill.
 * Earlier sets, and extra sets after the target, keep the new-set form ready.
 */
export function compactComposerAfterSavedSet(input: {
  savedSetIsWarmup: boolean;
  /** Working sets on this exercise after the save. Warmups are excluded. */
  workingSetCount: number;
  targetSets: number | null;
}): { showExtraSetComposer: boolean; focusNewSet: boolean } {
  const goal = input.targetSets;
  const hasGoal = goal != null && goal > 0;
  const workingBefore = input.savedSetIsWarmup
    ? input.workingSetCount
    : input.workingSetCount - 1;
  const metByThisSet = hasGoal && workingBefore < goal && input.workingSetCount >= goal;
  if (metByThisSet) {
    return { showExtraSetComposer: false, focusNewSet: false };
  }
  if (!hasGoal || input.workingSetCount < goal) {
    return { showExtraSetComposer: false, focusNewSet: true };
  }
  return { showExtraSetComposer: true, focusNewSet: true };
}

/** The one filled action on a logging screen. Every other control stays zinc. */
export type SessionLogPrimary =
  | "save-targets"
  | "save-set"
  | "set-targets"
  | "add-set"
  | "next-exercise"
  | "finish"
  | "none";

/**
 * True when a target weight is saved.
 * Sets and reps alone do not count. 0 kg counts, including an unassisted target.
 */
export function exerciseHasTargetWeight(exercise: {
  target_weight_kg?: number | null;
}): boolean {
  return exercise.target_weight_kg != null && Number.isFinite(exercise.target_weight_kg);
}

export function addSetComposerVisible(input: {
  canManageSets: boolean;
  targetsMet: boolean;
  singleExerciseFlow: boolean;
  showExtraSetComposer: boolean;
  addRowExpanded: boolean;
}): { compact: boolean; desktop: boolean } {
  if (!input.canManageSets) {
    return { compact: false, desktop: false };
  }
  return {
    compact: !(input.singleExerciseFlow && input.targetsMet && !input.showExtraSetComposer),
    desktop: !(input.targetsMet && !input.addRowExpanded),
  };
}

/**
 * Which control is filled sky for one exercise.
 * An open edit wins, then the targets form.
 * With no target weight yet, Set targets fills. Otherwise Add set fills.
 * Next exercise and Finish fill only after the add-set composer is hidden.
 */
export function exerciseLoggingPrimary(input: {
  targetsOpen: boolean;
  /** Compact sheet is open, so its Save stays the filled action. */
  targetsSheetOpen?: boolean;
  editingSet: boolean;
  canManageSets: boolean;
  /** False until a target weight is saved. Sets and reps alone still fill Set targets. */
  hasTargets: boolean;
  /** Skipped exercises keep Set targets disabled, so it does not fill. */
  notDone?: boolean;
  targetsMet: boolean;
  singleExerciseFlow: boolean;
  showExtraSetComposer: boolean;
  addRowExpanded: boolean;
  hasNextExercise: boolean;
  canFinish: boolean;
  /**
   * False for a later exercise on the desktop page, so only one Add set is filled.
   * The compact screen shows one exercise, so that exercise stays forward.
   */
  addSetForward?: boolean;
}): SessionLogPrimary {
  const composers = addSetComposerVisible(input);
  const addSetVisible = input.singleExerciseFlow ? composers.compact : composers.desktop;

  if (input.editingSet) {
    return "save-set";
  }
  if (input.targetsOpen || input.targetsSheetOpen) {
    return "save-targets";
  }
  if (!input.hasTargets && !input.notDone && input.addSetForward !== false) {
    return "set-targets";
  }
  if (addSetVisible && input.addSetForward !== false) {
    return "add-set";
  }
  if (
    input.singleExerciseFlow &&
    input.canManageSets &&
    input.targetsMet &&
    input.hasNextExercise
  ) {
    return "next-exercise";
  }
  if (input.canFinish && input.singleExerciseFlow && input.targetsMet && !input.hasNextExercise) {
    return "finish";
  }
  if (input.canFinish && !input.singleExerciseFlow) {
    return "finish";
  }
  return "none";
}

/** Session notes being edited take the filled action, so the set log stays zinc. */
export function shownLogPrimary(
  primary: SessionLogPrimary,
  detailsEditing: boolean,
): SessionLogPrimary {
  if (!detailsEditing) {
    return primary;
  }
  return "none";
}

/** Where Finish sits on a narrow screen. Quiet until it is the one forward action. */
export type CompactFinishChrome = "hidden" | "quiet" | "filled";

export function compactFinishChrome(input: {
  showFinish: boolean;
  finishPrimary: boolean;
}): CompactFinishChrome {
  if (!input.showFinish) {
    return "hidden";
  }
  if (input.finishPrimary) {
    return "filled";
  }
  return "quiet";
}

/** Header Finish is filled only when no exercise still owns the log. */
export function finishSessionIsPrimary(
  primaries: readonly SessionLogPrimary[],
  input: { canFinish: boolean; detailsEditing: boolean },
): boolean {
  if (!input.canFinish || input.detailsEditing) {
    return false;
  }
  return !primaries.some(
    (primary) =>
      primary === "add-set" ||
      primary === "save-set" ||
      primary === "save-targets" ||
      primary === "set-targets" ||
      primary === "next-exercise",
  );
}
