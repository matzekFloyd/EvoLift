/** The one filled action on a logging screen. Every other control stays zinc. */
export type SessionLogPrimary =
  | "save-targets"
  | "save-set"
  | "add-set"
  | "next-exercise"
  | "finish"
  | "none";

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
 * An open edit wins, then the targets form, then Add set.
 * Next exercise and Finish fill only after the add-set composer is hidden.
 */
export function exerciseLoggingPrimary(input: {
  targetsOpen: boolean;
  editingSet: boolean;
  canManageSets: boolean;
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
  if (input.targetsOpen) {
    return "save-targets";
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
      primary === "next-exercise",
  );
}
