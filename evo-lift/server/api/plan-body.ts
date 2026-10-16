import type { PlanDaySaveInput, PlanExerciseInput, PlanSaveInput } from "@/lib/plan-draft";
import { validatePlanSave } from "@/lib/plan-draft";
import { ApiHttpError } from "@/server/api/http";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function objectBody(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiHttpError(400, message);
  }
  return value as Record<string, unknown>;
}

function optionalNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "number" ? value : Number.NaN;
}

function optionalNullableInt(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "number" ? value : Number.NaN;
}

function parsePlanExercise(value: unknown): PlanExerciseInput {
  const body = objectBody(value, "Please choose an exercise for each row.");
  const exerciseId = typeof body.exercise_id === "string" ? body.exercise_id : "";
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
    throw new ApiHttpError(400, "notes must be a string or null.");
  }
  return {
    exerciseId,
    targetSets: optionalNullableInt(body.target_sets),
    targetReps: optionalNullableInt(body.target_reps),
    targetWeightKg: optionalNullableNumber(body.target_weight_kg),
    baseWeightKg: optionalNullableNumber(body.base_weight_kg),
    notes: typeof body.notes === "string" ? body.notes : null,
  };
}

function parsePlanDay(value: unknown): PlanDaySaveInput {
  const body = objectBody(value, "Please provide the plan days.");
  if (!Array.isArray(body.exercises)) {
    throw new ApiHttpError(400, "Please provide the plan days.");
  }
  const id = body.id;
  return {
    id: id == null || id === "" ? null : typeof id === "string" ? id : "not-a-day",
    name: typeof body.name === "string" ? body.name : "",
    exercises: body.exercises.map(parsePlanExercise),
  };
}

export function parsePlanSaveBody(body: Record<string, unknown>): PlanSaveInput {
  if (typeof body.name !== "string") {
    throw new ApiHttpError(400, "Please enter a plan name.");
  }
  if (!Array.isArray(body.days)) {
    throw new ApiHttpError(400, "Please provide the plan days.");
  }
  if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
    throw new ApiHttpError(400, "is_active must be a boolean.");
  }
  const notes = body.notes;
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    throw new ApiHttpError(400, "notes must be a string or null.");
  }
  for (const day of body.days) {
    const dayBody = objectBody(day, "Please provide the plan days.");
    if (typeof dayBody.id === "string" && dayBody.id !== "" && !UUID_RE.test(dayBody.id)) {
      throw new ApiHttpError(400, "That day is not part of this plan.");
    }
  }

  const plan: PlanSaveInput = {
    name: typeof body.name === "string" ? body.name : "",
    notes: typeof notes === "string" ? notes : null,
    isActive: body.is_active === true,
    days: body.days.map(parsePlanDay),
  };
  const message = validatePlanSave(plan);
  if (message) {
    throw new ApiHttpError(400, message);
  }
  return {
    ...plan,
    name: plan.name.trim(),
    notes: plan.notes?.trim() ? plan.notes.trim() : null,
    days: plan.days.map((day) => ({
      ...day,
      name: day.name.trim(),
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        notes: exercise.notes?.trim() ? exercise.notes.trim() : null,
      })),
    })),
  };
}
