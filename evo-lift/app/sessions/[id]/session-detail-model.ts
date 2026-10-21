import { isAssistanceExercise } from "@/lib/assistance-exercise";
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

type SessionDetailsFields = {
  performed_on: string;
  notes: string | null;
};

/** True when the performed-on or notes drafts differ from the saved session (notes compared trimmed). */
export function isSessionDetailsDirty(
  session: SessionDetailsFields | null,
  performedOnDraft: string,
  notesDraft: string,
): boolean {
  if (!session) {
    return false;
  }
  if (performedOnDraft !== session.performed_on) {
    return true;
  }
  return notesDraft.trim() !== (session.notes ?? "").trim();
}

/** True when logged working sets (warmups excluded) reach a positive target-sets goal. */
export function isTargetSetsGoalMet(
  exercise: { id: string; target_sets: number | null } | null | undefined,
  workoutSets: Array<{ session_exercise_id: string; is_warmup: boolean | null }>,
): boolean {
  if (!exercise) {
    return false;
  }
  const goal = exercise.target_sets;
  const workingCount = workoutSets.filter(
    (set) => set.session_exercise_id === exercise.id && !set.is_warmup,
  ).length;
  return goal != null && goal > 0 && workingCount >= goal;
}

/** Label for the compact sticky bar's forward button. */
export function stickyNextLabel(input: {
  singleExerciseFlow: boolean;
  canManageSets: boolean;
  targetSetsMet: boolean;
  showExtraSetComposer: boolean;
  activeExerciseIndex: number;
  exerciseCount: number;
}): "Next exercise" | "Next" {
  return input.singleExerciseFlow &&
    input.canManageSets &&
    input.targetSetsMet &&
    !input.showExtraSetComposer &&
    input.activeExerciseIndex < input.exerciseCount - 1
    ? "Next exercise"
    : "Next";
}

/** Exercises to render: only the active one in the compact single-exercise flow, otherwise all. */
export function visibleExerciseEntries<T>(
  sessionExercises: T[],
  activeExerciseIndex: number,
  singleExerciseFlow: boolean,
): Array<{ item: T; index: number }> {
  const entries = sessionExercises.map((item, index) => ({ item, index }));
  return singleExerciseFlow ? entries.filter(({ index }) => index === activeExerciseIndex) : entries;
}

/** Picks an exercise for the add form; assistance exercises have no base weight. */
export function applyAddExerciseSelection(
  draft: AddExerciseDraft,
  exerciseId: string,
  slug: string | undefined,
): AddExerciseDraft {
  return {
    ...draft,
    exerciseId,
    baseWeightKg: isAssistanceExercise(slug) ? "" : draft.baseWeightKg,
  };
}

/** Exercise the targets form edits; falls back to the active exercise label when none is selected. */
export function resolveTargetsExercise(input: {
  sessionExercises: Array<{ id: string; exercise_id: string }>;
  exerciseLabels: Map<string, string>;
  exerciseSlugById: Map<string, string>;
  targetsSessionExerciseId: string | null;
  activeExerciseLabel: string;
}): { label: string; exerciseId: string; slug: string | undefined } {
  const selected = input.targetsSessionExerciseId
    ? input.sessionExercises.find((item) => item.id === input.targetsSessionExerciseId)
    : undefined;
  const exerciseId = selected?.exercise_id ?? "";
  return {
    label: selected
      ? (input.exerciseLabels.get(selected.exercise_id) ?? selected.exercise_id)
      : input.activeExerciseLabel,
    exerciseId,
    slug: exerciseId ? input.exerciseSlugById.get(exerciseId) : undefined,
  };
}

export const CREATED_FROM_BADGE_CLASS =
  "rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600";

export function sessionLifecycleBadgeClass(status: string): string {
  return status === "completed"
    ? "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800"
    : "rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700";
}
