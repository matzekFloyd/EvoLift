import { appPath } from "@/lib/app-paths";
import { filterExercisePickerOptionsByQuery, type ExercisePickerOption } from "@/lib/exercise-picker-options";
import { compareByName, type NamedListSortDirection } from "@/lib/named-list-sort";

export type ExerciseListSortKey = "name" | "sessions";

export type ExerciseListSort = {
  key: ExerciseListSortKey;
  direction: NamedListSortDirection;
};

export const EXERCISE_LIST_INTRO = "Open an exercise to review your full set history.";
export const EXERCISE_LIST_EMPTY_ALL = "No exercises loaded.";
export const EXERCISE_LIST_EMPTY_USED =
  'No exercise history yet. Choose "All exercises" above, or log a workout session first.';
export const EXERCISE_LIST_EMPTY_SEARCH = "No exercises match that search.";

export type ExerciseListRow = ExercisePickerOption & {
  sessionCount: number;
};

export function exerciseDetailHref(slug: string): string {
  return appPath(`/exercises/${slug}`);
}

export function exerciseSessionCountLabel(count: number): string {
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}

/** Equal session counts stay in name order. */
export function sortExerciseListRows<T extends { label: string; sessionCount: number }>(
  rows: readonly T[],
  sort: ExerciseListSort,
): T[] {
  return [...rows].sort((left, right) => {
    if (sort.key === "sessions") {
      const byCount = left.sessionCount - right.sessionCount;
      const primary = sort.direction === "asc" ? byCount : -byCount;
      return primary !== 0 ? primary : compareByName(left.label, right.label, "asc");
    }
    return compareByName(left.label, right.label, sort.direction);
  });
}

export function visibleExerciseListRows<T extends ExerciseListRow>(
  rows: readonly T[],
  query: string,
  sort: ExerciseListSort,
): T[] {
  return sortExerciseListRows(filterExercisePickerOptionsByQuery([...rows], query) as T[], sort);
}
