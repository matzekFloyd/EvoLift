import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/database.types";
import { duplicatePlanName, validatePlanSave, type PlanSaveInput } from "@/lib/plan-draft";
import type { Database } from "@/lib/supabase/database.types";
import { ApiHttpError, MAX_SESSION_NOTES_LENGTH } from "@/server/api/http";
import { createWorkoutSession, requireWorkoutSessionDetail } from "@/server/db/workouts";

const PLAN_ERROR_MESSAGES = [
  "You must be logged in.",
  "Please enter a plan name.",
  "Plan name cannot be longer than 120 characters.",
  "Plan notes cannot be longer than 500 characters.",
  "Please provide the plan days.",
  "Please enter a name for each day.",
  "Day name cannot be longer than 80 characters.",
  "Each day can only appear once.",
  "That day is not part of this plan.",
  "Please choose an exercise for each row.",
  "A plan with this name already exists.",
  "Another plan is already active. Try again.",
  "Plan not found.",
  "Add at least one exercise to this day.",
] as const;

export type WorkoutPlanListItem = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  dayCount: number;
};

export type WorkoutPlanDayExerciseRow =
  Database["public"]["Tables"]["workout_plan_day_exercises"]["Row"];

export type WorkoutPlanDayWithExercises =
  Database["public"]["Tables"]["workout_plan_days"]["Row"] & {
    exercises: WorkoutPlanDayExerciseRow[];
  };

export type WorkoutPlanWithDays = Database["public"]["Tables"]["workout_plans"]["Row"] & {
  days: WorkoutPlanDayWithExercises[];
};

type PlanDayQuery = {
  id: string;
  plan_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  workout_plan_day_exercises: WorkoutPlanDayExerciseRow[] | null;
};

function throwPlanWriteError(error: { message: string }, fallback: string): never {
  for (const message of PLAN_ERROR_MESSAGES) {
    if (error.message.includes(message)) {
      const status = message === "Plan not found." ? 404 : 400;
      throw new ApiHttpError(status, message);
    }
  }
  if (error.message.includes("workout_plans_user_lower_name_uniq")) {
    throw new ApiHttpError(400, "A plan with this name already exists.");
  }
  if (error.message.includes("workout_plans_one_active_per_user")) {
    throw new ApiHttpError(400, "Another plan is already active. Try again.");
  }
  throw new Error(`${fallback}: ${error.message}`);
}

function sortPlan(plan: WorkoutPlanWithDays): WorkoutPlanWithDays {
  return {
    ...plan,
    days: [...plan.days]
      .sort((a, b) => a.position - b.position)
      .map((day) => ({
        ...day,
        exercises: [...day.exercises].sort((a, b) => a.position - b.position),
      })),
  };
}

export async function listPlans(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkoutPlanListItem[]> {
  const { data, error } = await client
    .from("workout_plans")
    .select("id, name, notes, is_active, created_at, updated_at, workout_plan_days(id)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list plans: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    dayCount: row.workout_plan_days?.length ?? 0,
  }));
}

export async function getPlanById(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<WorkoutPlanWithDays | null> {
  const { data, error } = await client
    .from("workout_plans")
    .select("*, workout_plan_days(*, workout_plan_day_exercises(*))")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load plan: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const days = ((data.workout_plan_days ?? []) as PlanDayQuery[]).map((day) => ({
    id: day.id,
    plan_id: day.plan_id,
    name: day.name,
    position: day.position,
    created_at: day.created_at,
    updated_at: day.updated_at,
    exercises: day.workout_plan_day_exercises ?? [],
  }));

  return sortPlan({
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    notes: data.notes,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    days,
  });
}

function planDaysPayload(input: PlanSaveInput): Json {
  return input.days.map((day) => ({
    id: day.id,
    name: day.name,
    exercises: day.exercises.map((exercise) => ({
      exercise_id: exercise.exerciseId,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      target_weight_kg: exercise.targetWeightKg,
      base_weight_kg: exercise.baseWeightKg,
      notes: exercise.notes,
    })),
  }));
}

async function savePlan(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string | null,
  input: PlanSaveInput,
): Promise<WorkoutPlanWithDays> {
  const message = validatePlanSave(input);
  if (message) {
    throw new ApiHttpError(400, message);
  }

  const { data, error } = await client.rpc("save_workout_plan", {
    p_plan_id: planId,
    p_name: input.name.trim(),
    p_notes: input.notes?.trim() ? input.notes.trim() : null,
    p_is_active: input.isActive,
    p_days: planDaysPayload(input),
  });

  if (error || !data) {
    throwPlanWriteError(error ?? { message: "unknown error" }, "Failed to save plan");
  }

  const full = await getPlanById(client, userId, data);
  if (!full) {
    throw new Error("Plan was saved but could not be reloaded.");
  }
  return full;
}

export async function createPlan(
  client: SupabaseClient<Database>,
  userId: string,
  input: PlanSaveInput,
): Promise<WorkoutPlanWithDays> {
  return savePlan(client, userId, null, input);
}

export async function updatePlan(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
  input: PlanSaveInput,
): Promise<WorkoutPlanWithDays> {
  return savePlan(client, userId, planId, input);
}

export async function deletePlan(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<void> {
  const existing = await getPlanById(client, userId, planId);
  if (!existing) {
    throw new ApiHttpError(404, "Plan not found.");
  }
  const { error } = await client
    .from("workout_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to delete plan: ${error.message}`);
  }
}

export async function setPlanActive(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
  isActive: boolean,
): Promise<void> {
  const { data, error } = await client
    .from("workout_plans")
    .update({ is_active: isActive })
    .eq("id", planId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throwPlanWriteError(error, "Failed to update the active plan");
  }
  if (!data) {
    throw new ApiHttpError(404, "Plan not found.");
  }
}

export async function duplicatePlan(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<WorkoutPlanWithDays> {
  const source = await getPlanById(client, userId, planId);
  if (!source) {
    throw new ApiHttpError(404, "Plan not found.");
  }

  const { data: names, error } = await client
    .from("workout_plans")
    .select("name")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to duplicate plan: ${error.message}`);
  }

  return createPlan(client, userId, {
    name: duplicatePlanName(
      (names ?? []).map((row) => row.name),
      source.name,
    ),
    notes: source.notes,
    isActive: false,
    days: source.days.map((day) => ({
      id: null,
      name: day.name,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exercise_id,
        targetSets: exercise.target_sets,
        targetReps: exercise.target_reps,
        targetWeightKg: exercise.target_weight_kg,
        baseWeightKg: exercise.base_weight_kg,
        notes: exercise.notes,
      })),
    })),
  });
}

export async function instantiatePlanDay(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    planId: string;
    planDayId: string;
    performedOn: string;
    notes?: string | null;
  },
): Promise<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.performedOn)) {
    throw new ApiHttpError(400, "Please choose a performed date.");
  }

  const notes = input.notes?.trim() ? input.notes.trim() : null;
  if (notes && notes.length > MAX_SESSION_NOTES_LENGTH) {
    throw new ApiHttpError(
      400,
      `Session notes cannot be longer than ${MAX_SESSION_NOTES_LENGTH} characters.`,
    );
  }

  const plan = await getPlanById(client, input.userId, input.planId);
  if (!plan) {
    throw new ApiHttpError(404, "Plan not found.");
  }
  const day = plan.days.find((item) => item.id === input.planDayId);
  if (!day) {
    throw new ApiHttpError(400, "That day is not part of this plan.");
  }
  if (day.exercises.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise to this day.");
  }

  const session = await createWorkoutSession(client, {
    userId: input.userId,
    performedOn: input.performedOn,
    notes,
    planId: plan.id,
    planDayId: day.id,
  });

  const exerciseRows: Database["public"]["Tables"]["workout_session_exercises"]["Insert"][] =
    day.exercises.map((row) => ({
      session_id: session.id,
      exercise_id: row.exercise_id,
      position: row.position,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      target_weight_kg: row.target_weight_kg,
      base_weight_kg: row.base_weight_kg,
      notes: row.notes,
    }));

  const { error: exercisesError } = await client
    .from("workout_session_exercises")
    .insert(exerciseRows);

  if (exercisesError) {
    await client.from("workout_sessions").delete().eq("id", session.id).eq("user_id", input.userId);
    throw new Error(`Failed to start session from plan day: ${exercisesError.message}`);
  }

  const detail = await requireWorkoutSessionDetail(client, input.userId, session.id);
  return detail.id;
}
