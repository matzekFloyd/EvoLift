import { ApiHttpError } from "@/server/api/http";
import {
  parseOptionalNonNegativeNumber,
  parseOptionalNotes,
  parseOptionalPositiveInt,
  parseOptionalUuid,
  requireUuid,
} from "@/server/api/http";
import type { SessionExerciseInput } from "@/server/db/workouts";

function parseExerciseFields(
  body: Record<string, unknown>,
  requireExerciseId: boolean,
): SessionExerciseInput {
  const exerciseId = requireExerciseId
    ? typeof body.exercise_id === "string"
      ? requireUuid(body.exercise_id, "exercise_id")
      : (() => {
          throw new ApiHttpError(400, "Please provide a valid exercise_id.");
        })()
    : (parseOptionalUuid(body.exercise_id, "exercise_id") ?? "");

  const targetSets = parseOptionalPositiveInt(body.target_sets, "target_sets");
  const targetReps = parseOptionalPositiveInt(body.target_reps, "target_reps");
  const targetWeightKg = parseOptionalNonNegativeNumber(
    body.target_weight_kg,
    "target_weight_kg",
  );
  const baseWeightKg = parseOptionalNonNegativeNumber(body.base_weight_kg, "base_weight_kg");
  const notes = parseOptionalNotes(body.notes, "notes");

  return {
    exerciseId,
    targetSets: targetSets === undefined ? null : targetSets,
    targetReps: targetReps === undefined ? null : targetReps,
    targetWeightKg: targetWeightKg === undefined ? null : targetWeightKg,
    baseWeightKg: baseWeightKg === undefined ? null : baseWeightKg,
    notes: notes === undefined ? null : notes,
  };
}

export function parseRequiredSessionExercise(
  value: unknown,
  index?: number,
): SessionExerciseInput {
  const prefix = index === undefined ? "exercise" : `exercises[${index}]`;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiHttpError(400, `${prefix} must be a JSON object.`);
  }
  return parseExerciseFields(value as Record<string, unknown>, true);
}

export function parseSessionExerciseList(value: unknown): SessionExerciseInput[] {
  if (!Array.isArray(value)) {
    throw new ApiHttpError(400, "exercises must be an array.");
  }
  if (value.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise.");
  }
  return value.map((item, index) => parseRequiredSessionExercise(item, index));
}

export function parseTemplateExerciseList(value: unknown): SessionExerciseInput[] {
  return parseSessionExerciseList(value);
}
