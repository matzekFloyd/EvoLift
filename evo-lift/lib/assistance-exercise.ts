/**
 * Machine-assisted bodyweight moves. The logged weight is assistance (counterweight),
 * not external load added to the bar. Blank or 0 means unassisted bodyweight.
 */
const ASSISTANCE_EXERCISE_SLUGS = new Set(["assisted-dip", "assisted-pull-up"]);

export function isAssistanceExercise(slug: string | null | undefined): boolean {
  return slug != null && ASSISTANCE_EXERCISE_SLUGS.has(slug);
}

/** Field label for the set weight input / column. */
export function externalLoadFieldLabel(slug: string | null | undefined): string {
  return isAssistanceExercise(slug) ? "Assistance (kg)" : "Loaded (kg)";
}

/** Short label before a value, e.g. "Assistance:" / "Loaded:". */
export function externalLoadValuePrefix(slug: string | null | undefined): string {
  return isAssistanceExercise(slug) ? "Assistance" : "Loaded";
}

/**
 * Target weight on a session exercise / plan row.
 * For assisted moves the target is assistance, not added load.
 */
export function targetWeightFieldLabel(slug: string | null | undefined): string {
  return isAssistanceExercise(slug) ? "Target assistance (kg)" : "Target weight (kg)";
}
