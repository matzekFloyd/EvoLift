/**
 * Barbell exercises that move more than one joint.
 * Same list as the Compound glossary entry.
 */
const COMPOUND_EXERCISE_SLUGS = new Set([
  "back-squat",
  "deadlift",
  "barbell-bench-press",
  "overhead-press",
  "barbell-bent-over-row",
  "romanian-deadlift",
  "close-grip-bench-press",
  "barbell-hip-thrust",
]);

export function isCompoundExercise(slug: string | null | undefined): boolean {
  return slug != null && COMPOUND_EXERCISE_SLUGS.has(slug);
}
