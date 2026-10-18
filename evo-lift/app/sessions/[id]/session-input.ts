export const PLANNED_SESSION_SETS_MESSAGE =
  "Planned workouts cannot have sets yet. Log sets on or after the session date.";

export const TARGETS_EXERCISE_MISSING = "Could not determine which exercise targets to update.";

export function parseLoggedSetInput(
  reps: string,
  weightKg: string,
): { ok: false; message: string } | { ok: true; reps: number; weightKg: number | null } {
  const parsedReps = Number(reps);
  if (!Number.isFinite(parsedReps) || parsedReps <= 0) {
    return { ok: false, message: "Please enter a valid reps value." };
  }
  const parsedWeight = weightKg ? Number(weightKg) : null;
  if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
    return { ok: false, message: "Please enter a valid weight." };
  }
  return { ok: true, reps: parsedReps, weightKg: parsedWeight };
}

export function nextSetNumber(setNumbers: number[]): number {
  if (setNumbers.length === 0) {
    return 1;
  }
  return Math.max(...setNumbers) + 1;
}

/**
 * Close gaps after a set is removed. Updates are in ascending current number order
 * so a unique (exercise, set number) constraint is not hit while shifting down.
 */
export function compactSetNumbers<T extends { id: string; set_number: number }>(
  remainingSets: T[],
): Array<{ id: string; setNumber: number }> {
  const ordered = [...remainingSets].sort(
    (left, right) => left.set_number - right.set_number || left.id.localeCompare(right.id),
  );
  const updates: Array<{ id: string; setNumber: number }> = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const setNumber = index + 1;
    if (ordered[index].set_number !== setNumber) {
      updates.push({ id: ordered[index].id, setNumber });
    }
  }
  return updates;
}

function parseOptionalNumber(
  value: string,
  invalid: (parsed: number) => boolean,
  message: string,
): { ok: false; message: string } | { ok: true; value: number | null } {
  if (!value) {
    return { ok: true, value: null };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || invalid(parsed)) {
    return { ok: false, message };
  }
  return { ok: true, value: parsed };
}

export function parseSessionTargets(input: {
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
}):
  | { ok: false; message: string }
  | { ok: true; targetSets: number | null; targetReps: number | null; targetWeightKg: number | null } {
  const sets = parseOptionalNumber(
    input.targetSets,
    (value) => value <= 0,
    "Please enter a valid number of target working sets.",
  );
  if (!sets.ok) {
    return sets;
  }
  const reps = parseOptionalNumber(
    input.targetReps,
    (value) => value <= 0,
    "Please enter a valid target reps value for working sets.",
  );
  if (!reps.ok) {
    return reps;
  }
  const weight = parseOptionalNumber(
    input.targetWeightKg,
    (value) => value < 0,
    "Please enter a valid target weight (kg) for working sets.",
  );
  if (!weight.ok) {
    return weight;
  }
  return {
    ok: true,
    targetSets: sets.value,
    targetReps: reps.value,
    targetWeightKg: weight.value,
  };
}

export function parseAddedSessionExercise(input: {
  exerciseId: string;
  alreadyInSession: boolean;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  baseWeightKg: string;
  /** Assisted Dip / Assisted Pull-Up: no bar base; always store null. */
  omitBaseWeight?: boolean;
}):
  | { ok: false; tone: "error" | "warning"; message: string }
  | {
      ok: true;
      targetSets: number | null;
      targetReps: number | null;
      targetWeightKg: number | null;
      baseWeightKg: number | null;
    } {
  if (!input.exerciseId) {
    return { ok: false, tone: "error", message: "Please choose an exercise to add." };
  }
  if (input.alreadyInSession) {
    return { ok: false, tone: "warning", message: "That exercise is already in this session." };
  }
  const targets = parseSessionTargets(input);
  if (!targets.ok) {
    return { ok: false, tone: "error", message: targets.message };
  }
  if (input.omitBaseWeight) {
    return {
      ok: true,
      targetSets: targets.targetSets,
      targetReps: targets.targetReps,
      targetWeightKg: targets.targetWeightKg,
      baseWeightKg: null,
    };
  }
  const baseWeight = parseOptionalNumber(
    input.baseWeightKg,
    (value) => value < 0,
    "Please enter a valid base weight.",
  );
  if (!baseWeight.ok) {
    return { ok: false, tone: "error", message: baseWeight.message };
  }
  return {
    ok: true,
    targetSets: targets.targetSets,
    targetReps: targets.targetReps,
    targetWeightKg: targets.targetWeightKg,
    baseWeightKg: baseWeight.value,
  };
}
