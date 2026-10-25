import type { ExerciseDraftRow } from "@/lib/workout-exercise-draft";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_PLAN_NAME_LENGTH = 120;
const MAX_PLAN_NOTES_LENGTH = 500;
const MAX_DAY_NAME_LENGTH = 80;
const MAX_EXERCISE_NOTES_LENGTH = 500;

export const MAX_PLAN_DAYS = 7;
export const PLAN_DAY_LIMIT_MESSAGE = "A plan can have at most 7 days.";

/** True when another day would pass the limit. Seven days can still be saved. */
export function planDayLimitReached(dayCount: number): boolean {
  return dayCount >= MAX_PLAN_DAYS;
}

export type PlanExerciseInput = {
  exerciseId: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  baseWeightKg: number | null;
  notes: string | null;
};

export type PlanDaySaveInput = {
  id: string | null;
  name: string;
  exercises: PlanExerciseInput[];
};

export type PlanSaveInput = {
  name: string;
  notes: string | null;
  isActive: boolean;
  days: PlanDaySaveInput[];
};

export type PlanDraftDayInput = {
  id: string | null;
  name: string;
  exerciseRows: ExerciseDraftRow[];
};

type Fail = { ok: false; message: string };
type Ok<T> = { ok: true; value: T };

function fail(message: string): Fail {
  return { ok: false, message };
}

function isBlankExerciseRow(row: ExerciseDraftRow): boolean {
  return (
    !row.exerciseId &&
    !row.baseWeightKg.trim() &&
    !row.targetSets.trim() &&
    !row.targetReps.trim() &&
    !row.targetWeightKg.trim() &&
    !row.notes.trim()
  );
}

function parseOptionalPositiveInt(
  raw: string,
  message: string,
): number | null | Fail {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) {
    return fail(message);
  }
  return Number(trimmed);
}

function parseOptionalNonNegative(
  raw: string,
  message: string,
): number | null | Fail {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return fail(message);
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return fail(message);
  }
  return value;
}

export function parsePlanExerciseDrafts(
  rows: ExerciseDraftRow[],
): Ok<PlanExerciseInput[]> | Fail {
  const exercises: PlanExerciseInput[] = [];

  for (const row of rows) {
    if (isBlankExerciseRow(row)) {
      continue;
    }
    if (!row.exerciseId || !UUID_RE.test(row.exerciseId)) {
      return fail("Please choose an exercise for each row.");
    }

    const targetSets = parseOptionalPositiveInt(
      row.targetSets,
      "Please enter a valid target sets value.",
    );
    if (targetSets && typeof targetSets === "object") {
      return targetSets;
    }
    const targetReps = parseOptionalPositiveInt(
      row.targetReps,
      "Please enter a valid target reps value.",
    );
    if (targetReps && typeof targetReps === "object") {
      return targetReps;
    }
    const targetWeightKg = parseOptionalNonNegative(
      row.targetWeightKg,
      "Please enter a valid target weight.",
    );
    if (targetWeightKg && typeof targetWeightKg === "object") {
      return targetWeightKg;
    }
    const baseWeightKg = parseOptionalNonNegative(
      row.baseWeightKg,
      "Please enter a valid base weight for each exercise.",
    );
    if (baseWeightKg && typeof baseWeightKg === "object") {
      return baseWeightKg;
    }

    const notes = row.notes.trim();
    if (notes.length > MAX_EXERCISE_NOTES_LENGTH) {
      return fail(
        `Exercise notes cannot be longer than ${MAX_EXERCISE_NOTES_LENGTH} characters.`,
      );
    }

    exercises.push({
      exerciseId: row.exerciseId,
      targetSets,
      targetReps,
      targetWeightKg,
      baseWeightKg,
      notes: notes.length > 0 ? notes : null,
    });
  }

  return { ok: true, value: exercises };
}

export function validatePlanSave(input: PlanSaveInput): string | null {
  const name = input.name.trim();
  if (!name) {
    return "Please enter a plan name.";
  }
  if (name.length > MAX_PLAN_NAME_LENGTH) {
    return "Plan name cannot be longer than 120 characters.";
  }

  const notes = input.notes?.trim() ? input.notes.trim() : null;
  if (notes && notes.length > MAX_PLAN_NOTES_LENGTH) {
    return "Plan notes cannot be longer than 500 characters.";
  }

  if (input.days.length > MAX_PLAN_DAYS) {
    return PLAN_DAY_LIMIT_MESSAGE;
  }

  const seenDayIds = new Set<string>();
  for (const day of input.days) {
    const dayName = day.name.trim();
    if (!dayName) {
      return "Please enter a name for each day.";
    }
    if (dayName.length > MAX_DAY_NAME_LENGTH) {
      return "Day name cannot be longer than 80 characters.";
    }
    if (day.id) {
      if (!UUID_RE.test(day.id)) {
        return "That day is not part of this plan.";
      }
      if (seenDayIds.has(day.id)) {
        return "Each day can only appear once.";
      }
      seenDayIds.add(day.id);
    }

    for (const exercise of day.exercises) {
      if (!UUID_RE.test(exercise.exerciseId)) {
        return "Please choose an exercise for each row.";
      }
      if (
        exercise.targetSets != null &&
        (!Number.isInteger(exercise.targetSets) || exercise.targetSets <= 0)
      ) {
        return "Please enter a valid target sets value.";
      }
      if (
        exercise.targetReps != null &&
        (!Number.isInteger(exercise.targetReps) || exercise.targetReps <= 0)
      ) {
        return "Please enter a valid target reps value.";
      }
      if (
        exercise.targetWeightKg != null &&
        (!Number.isFinite(exercise.targetWeightKg) || exercise.targetWeightKg < 0)
      ) {
        return "Please enter a valid target weight.";
      }
      if (
        exercise.baseWeightKg != null &&
        (!Number.isFinite(exercise.baseWeightKg) || exercise.baseWeightKg < 0)
      ) {
        return "Please enter a valid base weight for each exercise.";
      }
      if (exercise.notes && exercise.notes.length > MAX_EXERCISE_NOTES_LENGTH) {
        return `Exercise notes cannot be longer than ${MAX_EXERCISE_NOTES_LENGTH} characters.`;
      }
    }
  }

  return null;
}

export function normalizePlanDraft(input: {
  name: string;
  notes: string;
  isActive: boolean;
  days: PlanDraftDayInput[];
}): Ok<PlanSaveInput> | Fail {
  const days: PlanDaySaveInput[] = [];
  for (const day of input.days) {
    const parsed = parsePlanExerciseDrafts(day.exerciseRows);
    if (!parsed.ok) {
      return parsed;
    }
    days.push({
      id: day.id,
      name: day.name,
      exercises: parsed.value,
    });
  }

  const save: PlanSaveInput = {
    name: input.name.trim(),
    notes: input.notes.trim() ? input.notes.trim() : null,
    isActive: input.isActive,
    days: days.map((day) => ({
      ...day,
      name: day.name.trim(),
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        notes: exercise.notes?.trim() ? exercise.notes.trim() : null,
      })),
    })),
  };
  const message = validatePlanSave(save);
  if (message) {
    return fail(message);
  }
  return { ok: true, value: save };
}

export function duplicatePlanName(existingNames: string[], sourceName: string): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const root = sourceName.trim() || "Plan";

  function candidate(suffix: string): string {
    const trimmedRoot = root.slice(0, Math.max(1, 120 - suffix.length));
    return `${trimmedRoot}${suffix}`;
  }

  const first = candidate(" copy");
  if (!taken.has(first.toLowerCase())) {
    return first;
  }

  for (let index = 2; index < 1000; index += 1) {
    const next = candidate(` copy ${index}`);
    if (!taken.has(next.toLowerCase())) {
      return next;
    }
  }

  return candidate(" copy");
}
