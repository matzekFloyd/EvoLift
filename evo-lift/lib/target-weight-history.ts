import type { SupabaseClient } from "@supabase/supabase-js";
import type { TargetWeightHistorySet } from "@/lib/target-weight-suggestion";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type SessionExerciseHistoryRow = {
  id: string;
  session_id: string;
  target_weight_kg: number | null;
};

type SessionHistoryRow = {
  id: string;
  performed_on: string;
  created_at: string;
};

type SetHistoryRow = {
  session_exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
};

/**
 * Working and warmup sets for one exercise, for the signed-in user.
 * The suggestion function decides which rows qualify.
 */
export async function loadTargetWeightHistory(
  client: Client,
  exerciseId: string,
): Promise<TargetWeightHistorySet[]> {
  if (!exerciseId) {
    return [];
  }

  const { data: authData, error: authError } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) {
    throw new Error("Could not load recent working sets.");
  }

  const { data: sessionExerciseRows, error: sessionExercisesError } = await fetchAllPages<SessionExerciseHistoryRow>(
    (from, to) =>
      client
        .from("workout_session_exercises")
        .select("id, session_id, target_weight_kg")
        .eq("exercise_id", exerciseId)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionExercisesError) {
    throw new Error("Could not load recent working sets.");
  }
  if (sessionExerciseRows.length === 0) {
    return [];
  }

  const sessionIds = [...new Set(sessionExerciseRows.map((row) => row.session_id))];
  const { data: sessionRows, error: sessionsError } = await fetchInChunks<SessionHistoryRow>(
    sessionIds,
    (chunk, from, to) =>
      client
        .from("workout_sessions")
        .select("id, performed_on, created_at")
        .in("id", chunk)
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionsError) {
    throw new Error("Could not load recent working sets.");
  }

  const sessionById = new Map(sessionRows.map((row) => [row.id, row]));
  const ownedExercises = sessionExerciseRows.filter((row) => sessionById.has(row.session_id));
  if (ownedExercises.length === 0) {
    return [];
  }

  const exerciseById = new Map(ownedExercises.map((row) => [row.id, row]));
  const { data: setRows, error: setsError } = await fetchInChunks<SetHistoryRow>(
    ownedExercises.map((row) => row.id),
    (chunk, from, to) =>
      client
        .from("workout_sets")
        .select("session_exercise_id, set_number, reps, weight_kg, is_warmup")
        .in("session_exercise_id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (setsError) {
    throw new Error("Could not load recent working sets.");
  }

  const history: TargetWeightHistorySet[] = [];
  for (const setRow of setRows) {
    const sessionExercise = exerciseById.get(setRow.session_exercise_id);
    if (!sessionExercise) {
      continue;
    }
    const session = sessionById.get(sessionExercise.session_id);
    if (!session) {
      continue;
    }
    history.push({
      sessionId: session.id,
      performedOn: session.performed_on.slice(0, 10),
      sessionCreatedAt: session.created_at,
      setNumber: setRow.set_number,
      reps: setRow.reps,
      loadedKg: setRow.weight_kg,
      isWarmup: setRow.is_warmup,
      targetWeightKg: sessionExercise.target_weight_kg,
    });
  }
  return history;
}
