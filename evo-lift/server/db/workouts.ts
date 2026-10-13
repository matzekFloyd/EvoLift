import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isFutureSessionDate } from "@/lib/session-date";
import { ApiHttpError } from "@/server/api/http";

export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutSessionExerciseRow =
  Database["public"]["Tables"]["workout_session_exercises"]["Row"];
export type WorkoutSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];

export type SessionExerciseInput = {
  exerciseId: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  baseWeightKg: number | null;
  notes: string | null;
};

export type WorkoutSessionListItem = WorkoutSessionRow & {
  exercise_count: number;
};

export type WorkoutSessionExerciseWithSets = WorkoutSessionExerciseRow & {
  sets: WorkoutSetRow[];
};

export type WorkoutSessionDetail = WorkoutSessionRow & {
  exercises: WorkoutSessionExerciseWithSets[];
};

type CreateWorkoutSessionInput = {
  userId: string;
  performedOn?: string;
  notes?: string | null;
  sourceTemplateId?: string | null;
};

type UpdateWorkoutSetInput = {
  id: string;
  reps?: number;
  weightKg?: number | null;
  isWarmup?: boolean;
  notes?: string | null;
};

export async function createWorkoutSession(
  client: SupabaseClient<Database>,
  input: CreateWorkoutSessionInput,
) {
  const payload: Database["public"]["Tables"]["workout_sessions"]["Insert"] = {
    user_id: input.userId,
    performed_on: input.performedOn,
    notes: input.notes,
    source_template_id: input.sourceTemplateId,
  };

  const { data, error } = await client
    .from("workout_sessions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create workout session: ${error.message}`);
  }

  return data;
}

export async function updateWorkoutSet(
  client: SupabaseClient<Database>,
  input: UpdateWorkoutSetInput,
) {
  const updatePayload: Database["public"]["Tables"]["workout_sets"]["Update"] =
    {};

  if (input.reps !== undefined) {
    updatePayload.reps = input.reps;
  }
  if (input.weightKg !== undefined) {
    updatePayload.weight_kg = input.weightKg;
  }
  if (input.isWarmup !== undefined) {
    updatePayload.is_warmup = input.isWarmup;
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  const { data, error } = await client
    .from("workout_sets")
    .update(updatePayload)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update workout set: ${error.message}`);
  }

  return data;
}

export async function listWorkoutSessions(
  client: SupabaseClient<Database>,
  userId: string,
  range?: { from?: string; to?: string },
): Promise<WorkoutSessionListItem[]> {
  let query = client
    .from("workout_sessions")
    .select("id, user_id, performed_on, notes, source_template_id, created_at, updated_at, workout_session_exercises(id)")
    .eq("user_id", userId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (range?.from) {
    query = query.gte("performed_on", range.from);
  }
  if (range?.to) {
    query = query.lte("performed_on", range.to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list workout sessions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    performed_on: row.performed_on,
    notes: row.notes,
    source_template_id: row.source_template_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exercise_count: row.workout_session_exercises?.length ?? 0,
  }));
}

export async function getOwnedWorkoutSession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionRow | null> {
  const { data, error } = await client
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workout session: ${error.message}`);
  }
  return data;
}

export async function requireOwnedWorkoutSession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionRow> {
  const session = await getOwnedWorkoutSession(client, userId, sessionId);
  if (!session) {
    throw new ApiHttpError(404, "Workout session not found.");
  }
  return session;
}

export async function getWorkoutSessionDetail(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionDetail | null> {
  const session = await getOwnedWorkoutSession(client, userId, sessionId);
  if (!session) {
    return null;
  }

  const { data: exercises, error: exercisesError } = await client
    .from("workout_session_exercises")
    .select("*")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  if (exercisesError) {
    throw new Error(`Failed to load session exercises: ${exercisesError.message}`);
  }

  const exerciseRows = exercises ?? [];
  const exerciseIds = exerciseRows.map((row) => row.id);
  let setRows: WorkoutSetRow[] = [];
  if (exerciseIds.length > 0) {
    const { data: sets, error: setsError } = await client
      .from("workout_sets")
      .select("*")
      .in("session_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });
    if (setsError) {
      throw new Error(`Failed to load workout sets: ${setsError.message}`);
    }
    setRows = sets ?? [];
  }

  const setsByExercise = new Map<string, WorkoutSetRow[]>();
  for (const set of setRows) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  return {
    ...session,
    exercises: exerciseRows.map((exercise) => ({
      ...exercise,
      sets: setsByExercise.get(exercise.id) ?? [],
    })),
  };
}

export async function requireWorkoutSessionDetail(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionDetail> {
  const detail = await getWorkoutSessionDetail(client, userId, sessionId);
  if (!detail) {
    throw new ApiHttpError(404, "Workout session not found.");
  }
  return detail;
}

function assertUniqueExerciseIds(exercises: SessionExerciseInput[]): void {
  const seen = new Set<string>();
  for (const row of exercises) {
    if (seen.has(row.exerciseId)) {
      throw new ApiHttpError(400, "That exercise is already in this session.");
    }
    seen.add(row.exerciseId);
  }
}

async function insertSessionExercises(
  client: SupabaseClient<Database>,
  sessionId: string,
  exercises: SessionExerciseInput[],
  startPosition: number,
): Promise<void> {
  const exerciseRows: Database["public"]["Tables"]["workout_session_exercises"]["Insert"][] =
    exercises.map((row, index) => ({
      session_id: sessionId,
      exercise_id: row.exerciseId,
      position: startPosition + index,
      base_weight_kg: row.baseWeightKg,
      target_sets: row.targetSets,
      target_reps: row.targetReps,
      target_weight_kg: row.targetWeightKg,
      notes: row.notes,
    }));

  const { error } = await client.from("workout_session_exercises").insert(exerciseRows);
  if (error) {
    throw new Error(`Failed to save session exercises: ${error.message}`);
  }
}

export async function createWorkoutSessionWithExercises(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    performedOn: string;
    notes: string | null;
    exercises: SessionExerciseInput[];
  },
): Promise<WorkoutSessionDetail> {
  if (input.exercises.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise.");
  }
  assertUniqueExerciseIds(input.exercises);

  const session = await createWorkoutSession(client, {
    userId: input.userId,
    performedOn: input.performedOn,
    notes: input.notes,
  });

  try {
    await insertSessionExercises(client, session.id, input.exercises, 1);
  } catch (error) {
    await client.from("workout_sessions").delete().eq("id", session.id).eq("user_id", input.userId);
    throw error;
  }

  return requireWorkoutSessionDetail(client, input.userId, session.id);
}

export async function updateWorkoutSession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  input: { performedOn?: string; notes?: string | null },
): Promise<WorkoutSessionDetail> {
  await requireOwnedWorkoutSession(client, userId, sessionId);

  if (input.performedOn !== undefined && isFutureSessionDate(input.performedOn)) {
    const detail = await requireWorkoutSessionDetail(client, userId, sessionId);
    const hasSets = detail.exercises.some((exercise) => exercise.sets.length > 0);
    if (hasSets) {
      throw new ApiHttpError(
        400,
        "This session already has logged sets. Choose today or an earlier date.",
      );
    }
  }

  const updatePayload: Database["public"]["Tables"]["workout_sessions"]["Update"] = {};
  if (input.performedOn !== undefined) {
    updatePayload.performed_on = input.performedOn;
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiHttpError(400, "Provide performed_on and/or notes to update.");
  }

  const { data, error } = await client
    .from("workout_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update workout session: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Workout session not found.");
  }

  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function deleteWorkoutSession(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
): Promise<void> {
  await requireOwnedWorkoutSession(client, userId, sessionId);
  const { error } = await client
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to delete workout session: ${error.message}`);
  }
}

async function requireOwnedSessionExercise(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<WorkoutSessionExerciseRow> {
  await requireOwnedWorkoutSession(client, userId, sessionId);
  const { data, error } = await client
    .from("workout_session_exercises")
    .select("*")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load session exercise: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Session exercise not found.");
  }
  return data;
}

export async function addSessionExercise(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  input: SessionExerciseInput,
): Promise<WorkoutSessionDetail> {
  const detail = await requireWorkoutSessionDetail(client, userId, sessionId);
  if (detail.exercises.some((row) => row.exercise_id === input.exerciseId)) {
    throw new ApiHttpError(400, "That exercise is already in this session.");
  }

  const nextPosition =
    detail.exercises.length > 0
      ? Math.max(...detail.exercises.map((row) => row.position)) + 1
      : 1;

  await insertSessionExercises(client, sessionId, [input], nextPosition);
  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function updateSessionExercise(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  input: {
    targetSets?: number | null;
    targetReps?: number | null;
    targetWeightKg?: number | null;
    baseWeightKg?: number | null;
    notes?: string | null;
  },
): Promise<WorkoutSessionDetail> {
  await requireOwnedSessionExercise(client, userId, sessionId, sessionExerciseId);

  const updatePayload: Database["public"]["Tables"]["workout_session_exercises"]["Update"] =
    {};
  if (input.targetSets !== undefined) {
    updatePayload.target_sets = input.targetSets;
  }
  if (input.targetReps !== undefined) {
    updatePayload.target_reps = input.targetReps;
  }
  if (input.targetWeightKg !== undefined) {
    updatePayload.target_weight_kg = input.targetWeightKg;
  }
  if (input.baseWeightKg !== undefined) {
    updatePayload.base_weight_kg = input.baseWeightKg;
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiHttpError(400, "Provide at least one field to update.");
  }

  const { data, error } = await client
    .from("workout_session_exercises")
    .update(updatePayload)
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update session exercise: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Session exercise not found.");
  }

  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function deleteSessionExercise(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<WorkoutSessionDetail> {
  await requireOwnedSessionExercise(client, userId, sessionId, sessionExerciseId);
  const { error } = await client
    .from("workout_session_exercises")
    .delete()
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId);
  if (error) {
    throw new Error(`Failed to delete session exercise: ${error.message}`);
  }
  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function addWorkoutSet(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  input: { reps: number; weightKg: number | null; isWarmup: boolean; notes?: string | null },
): Promise<WorkoutSessionDetail> {
  const session = await requireOwnedWorkoutSession(client, userId, sessionId);
  if (isFutureSessionDate(session.performed_on)) {
    throw new ApiHttpError(
      400,
      "Planned workouts cannot have sets yet. Log sets on or after the session date.",
    );
  }

  const detail = await requireWorkoutSessionDetail(client, userId, sessionId);
  const sessionExercise = detail.exercises.find((row) => row.id === sessionExerciseId);
  if (!sessionExercise) {
    throw new ApiHttpError(404, "Session exercise not found.");
  }

  const nextSetNumber =
    sessionExercise.sets.length > 0
      ? Math.max(...sessionExercise.sets.map((set) => set.set_number)) + 1
      : 1;

  const { error } = await client.from("workout_sets").insert({
    session_exercise_id: sessionExerciseId,
    set_number: nextSetNumber,
    reps: input.reps,
    weight_kg: input.weightKg,
    is_warmup: input.isWarmup,
    notes: input.notes ?? null,
  });

  if (error) {
    throw new Error(`Failed to add set: ${error.message}`);
  }

  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function updateOwnedWorkoutSet(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  setId: string,
  input: {
    reps?: number;
    weightKg?: number | null;
    isWarmup?: boolean;
    notes?: string | null;
  },
): Promise<WorkoutSessionDetail> {
  const detail = await requireWorkoutSessionDetail(client, userId, sessionId);
  const sessionExercise = detail.exercises.find((row) => row.id === sessionExerciseId);
  if (!sessionExercise) {
    throw new ApiHttpError(404, "Session exercise not found.");
  }
  if (!sessionExercise.sets.some((set) => set.id === setId)) {
    throw new ApiHttpError(404, "Set not found.");
  }

  const updatePayload: Database["public"]["Tables"]["workout_sets"]["Update"] = {};
  if (input.reps !== undefined) {
    updatePayload.reps = input.reps;
  }
  if (input.weightKg !== undefined) {
    updatePayload.weight_kg = input.weightKg;
  }
  if (input.isWarmup !== undefined) {
    updatePayload.is_warmup = input.isWarmup;
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiHttpError(400, "Provide at least one field to update.");
  }

  const { data, error } = await client
    .from("workout_sets")
    .update(updatePayload)
    .eq("id", setId)
    .eq("session_exercise_id", sessionExerciseId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update set: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Set not found.");
  }

  return requireWorkoutSessionDetail(client, userId, sessionId);
}

export async function deleteOwnedWorkoutSet(
  client: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  setId: string,
): Promise<WorkoutSessionDetail> {
  const detail = await requireWorkoutSessionDetail(client, userId, sessionId);
  const sessionExercise = detail.exercises.find((row) => row.id === sessionExerciseId);
  if (!sessionExercise) {
    throw new ApiHttpError(404, "Session exercise not found.");
  }
  if (!sessionExercise.sets.some((set) => set.id === setId)) {
    throw new ApiHttpError(404, "Set not found.");
  }

  const { error } = await client
    .from("workout_sets")
    .delete()
    .eq("id", setId)
    .eq("session_exercise_id", sessionExerciseId);

  if (error) {
    throw new Error(`Failed to delete set: ${error.message}`);
  }

  return requireWorkoutSessionDetail(client, userId, sessionId);
}
