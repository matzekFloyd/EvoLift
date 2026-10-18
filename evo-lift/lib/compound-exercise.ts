/**
 * Barbell exercises that move more than one joint.
 * Same list as the Compound glossary entry.
 */
const COMPOUND_EXERCISE_SLUGS = new Set([
  "back-squat",
  "barbell-bench-press",
  "barbell-bent-over-row",
  "barbell-hip-thrust",
  "barbell-incline-press",
  "barbell-romanian-deadlift",
  "close-grip-bench-press",
  "deadlift",
  "front-squat",
  "overhead-press",
  "sumo-deadlift",
  "trap-bar-deadlift",
]);

export function isCompoundExercise(slug: string | null | undefined): boolean {
  return slug != null && COMPOUND_EXERCISE_SLUGS.has(slug);
}
