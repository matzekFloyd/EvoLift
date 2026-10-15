import {
  resolveSuggestedAddDraft,
  type SessionExerciseTargets,
  type SessionSetDraft,
  type SessionWorkingSet,
} from "./session-set-draft";

export type AddExerciseDraft = {
  exerciseId: string;
  baseWeightKg: string;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  notes: string;
};

export type MessageTone = "error" | "warning" | "success";

export const maxSessionNotesLength = 500;
export const maxExerciseNotesLength = 500;

export const emptySetDraft: SessionSetDraft = {
  reps: "",
  weightKg: "",
  isWarmup: false,
};

export const emptyAddExerciseDraft: AddExerciseDraft = {
  exerciseId: "",
  baseWeightKg: "",
  targetSets: "",
  targetReps: "",
  targetWeightKg: "",
  notes: "",
};

type OrderedSessionSet = SessionWorkingSet & {
  session_exercise_id: string;
  set_number: number;
};

export function setsForSessionExercise<T extends OrderedSessionSet>(
  workoutSets: T[],
  sessionExerciseId: string,
): T[] {
  return workoutSets
    .filter((set) => set.session_exercise_id === sessionExerciseId)
    .sort((a, b) => a.set_number - b.set_number);
}

export function lastLoggedSet<T extends OrderedSessionSet>(
  workoutSets: T[],
  sessionExerciseId: string,
): T | null {
  const sets = setsForSessionExercise(workoutSets, sessionExerciseId);
  if (sets.length === 0) {
    return null;
  }
  return sets[sets.length - 1] ?? null;
}

export function exerciseLabelForSessionExercise(
  sessionExercises: Array<{ id: string; exercise_id: string }>,
  exerciseLabels: Map<string, string>,
  sessionExerciseId: string,
): string {
  const sessionExercise = sessionExercises.find((item) => item.id === sessionExerciseId);
  if (!sessionExercise) {
    return "exercise";
  }
  return exerciseLabels.get(sessionExercise.exercise_id) ?? sessionExercise.exercise_id;
}

export function resolvedAddDraft(
  sessionExercises: Array<SessionExerciseTargets & { id: string }>,
  workoutSets: OrderedSessionSet[],
  addDrafts: Record<string, Partial<SessionSetDraft>>,
  sessionExerciseId: string,
): SessionSetDraft {
  const sessionExercise = sessionExercises.find((item) => item.id === sessionExerciseId);
  return resolveSuggestedAddDraft(
    sessionExercise,
    setsForSessionExercise(workoutSets, sessionExerciseId),
    addDrafts[sessionExerciseId],
  );
}
