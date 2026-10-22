export type ContinueSessionExercise = {
  id: string;
  position: number;
  targetSets: number | null;
  notDone: boolean;
};

export type ContinueSessionSet = {
  sessionExerciseId: string;
  isWarmup: boolean;
};

/**
 * Exercise id for Continue session's `ex` query.
 * The first unfinished exercise in session order. Null when that exercise is first,
 * or when every exercise is skipped or has already met its target working sets.
 * Warmup sets do not count toward the target.
 */
export function continueSessionExerciseId(
  exercises: readonly ContinueSessionExercise[],
  sets: readonly ContinueSessionSet[],
): string | null {
  if (exercises.length === 0) {
    return null;
  }

  const ordered = exercises
    .map((exercise, index) => ({ exercise, index }))
    .sort((a, b) => a.exercise.position - b.exercise.position || a.index - b.index)
    .map(({ exercise }) => exercise);

  const workingCountByExerciseId = new Map<string, number>();
  for (const set of sets) {
    if (set.isWarmup) {
      continue;
    }
    workingCountByExerciseId.set(
      set.sessionExerciseId,
      (workingCountByExerciseId.get(set.sessionExerciseId) ?? 0) + 1,
    );
  }

  const unfinishedIndex = ordered.findIndex((exercise) => {
    if (exercise.notDone) {
      return false;
    }
    const targetSets = exercise.targetSets;
    const workingCount = workingCountByExerciseId.get(exercise.id) ?? 0;
    const targetMet = targetSets != null && targetSets > 0 && workingCount >= targetSets;
    return !targetMet;
  });

  if (unfinishedIndex <= 0) {
    return null;
  }
  return ordered[unfinishedIndex]?.id ?? null;
}
