import { SESSION_DETAIL_EXERCISE_QUERY } from "./session-detail-query";

export type ActiveExerciseFromUrl =
  | { action: "none" }
  | { action: "set"; index: number; clearParam: boolean };

/**
 * Decides which exercise the `?exercise=` param selects after the page or its exercise list changed.
 * An unknown id falls back to the first exercise and asks for the param to be removed.
 * When the list changed and the URL names no exercise, the current selection is kept.
 */
export function resolveActiveExerciseFromUrl(input: {
  exerciseIds: string[];
  exerciseParam: string | null;
  listChanged: boolean;
}): ActiveExerciseFromUrl {
  const { exerciseIds, exerciseParam, listChanged } = input;
  if (exerciseIds.length === 0) {
    return { action: "set", index: 0, clearParam: Boolean(exerciseParam) };
  }
  if (!exerciseParam) {
    return listChanged ? { action: "none" } : { action: "set", index: 0, clearParam: false };
  }
  const index = exerciseIds.indexOf(exerciseParam);
  return index >= 0
    ? { action: "set", index, clearParam: false }
    : { action: "set", index: 0, clearParam: true };
}

/**
 * Query string that reflects the active exercise (the first exercise omits the param),
 * or null when the URL already matches.
 */
export function activeExerciseQueryString(input: {
  searchString: string;
  activeExerciseIndex: number;
  activeExerciseId: string;
}): string | null {
  const params = new URLSearchParams(input.searchString);
  const current = params.get(SESSION_DETAIL_EXERCISE_QUERY);

  if (input.activeExerciseIndex === 0) {
    if (!current) {
      return null;
    }
    params.delete(SESSION_DETAIL_EXERCISE_QUERY);
  } else {
    if (current === input.activeExerciseId) {
      return null;
    }
    params.set(SESSION_DETAIL_EXERCISE_QUERY, input.activeExerciseId);
  }

  const qs = params.toString();
  return qs === input.searchString ? null : qs;
}

/**
 * Index to apply before paint when `ex` names an exercise.
 * Null when the current index already matches, or when the URL names no exercise.
 */
export function activeExerciseIndexForParam(input: {
  exerciseIds: readonly string[];
  exerciseParam: string | null;
  activeExerciseIndex: number;
}): number | null {
  if (!input.exerciseParam || input.exerciseIds.length === 0) {
    return null;
  }
  const next = resolveActiveExerciseFromUrl({
    exerciseIds: [...input.exerciseIds],
    exerciseParam: input.exerciseParam,
    listChanged: true,
  });
  if (next.action !== "set" || next.index === input.activeExerciseIndex) {
    return null;
  }
  return next.index;
}
