export type ExerciseListScope = "used" | "all";

/** Working-set samples for Insights lists: progress, lift comparison, personal bests, and the 1RM chart. */
export function visibleInsightExerciseSets<T extends { exerciseId: string }>(
  samples: readonly T[],
  hiddenExerciseIds: ReadonlySet<string>,
): T[] {
  if (hiddenExerciseIds.size === 0) {
    return [...samples];
  }
  return samples.filter((sample) => !hiddenExerciseIds.has(sample.exerciseId));
}

/**
 * Exercises page, both scopes. Session history still counts; the row is omitted either way.
 */
export function exercisesForList<T extends { id: string; sessionCount: number }>(
  exercises: readonly T[],
  hiddenExerciseIds: ReadonlySet<string>,
  scope: ExerciseListScope,
): T[] {
  const visible =
    hiddenExerciseIds.size === 0
      ? exercises
      : exercises.filter((exercise) => !hiddenExerciseIds.has(exercise.id));
  if (scope === "all") {
    return [...visible];
  }
  return visible.filter((exercise) => exercise.sessionCount > 0);
}
