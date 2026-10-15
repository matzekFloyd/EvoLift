import type { SupabaseClient } from "@supabase/supabase-js";
import {
  roundKg,
  workingSetTotalKg,
  type MilestoneWorkingSet,
} from "@/lib/milestone-progress";
import { fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type SessionExerciseRow = {
  id: string;
  exercise_id: string;
  base_weight_kg: number | null;
  session_id: string;
};

type SetRow = {
  session_exercise_id: string;
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
  performed_at: string;
};

/** Working sets for the given exercises only. Warmups are left out. */
export async function loadMilestoneWorkingSets(
  client: Client,
  exerciseIds: string[],
): Promise<MilestoneWorkingSet[]> {
  const uniqueIds = [...new Set(exerciseIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const { data: sessionExercises, error: sessionExercisesError } = await fetchInChunks(
    uniqueIds,
    (chunk, from, to) =>
      client
        .from("workout_session_exercises")
        .select("id, exercise_id, base_weight_kg, session_id")
        .in("exercise_id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionExercisesError) {
    throw new Error("Could not load workout sets.");
  }

  const exercises = sessionExercises as SessionExerciseRow[];
  const exerciseBySessionExerciseId = new Map(exercises.map((row) => [row.id, row]));
  const sessionExerciseIds = exercises.map((row) => row.id);
  if (sessionExerciseIds.length === 0) {
    return [];
  }

  const { data: setRows, error: setsError } = await fetchInChunks(sessionExerciseIds, (chunk, from, to) =>
    client
      .from("workout_sets")
      .select("session_exercise_id, reps, weight_kg, is_warmup, performed_at")
      .in("session_exercise_id", chunk)
      .eq("is_warmup", false)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (setsError) {
    throw new Error("Could not load workout sets.");
  }

  const sessionIds = [...new Set(exercises.map((row) => row.session_id).filter(Boolean))];
  const performedOnBySessionId = new Map<string, string>();
  if (sessionIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await fetchInChunks(sessionIds, (chunk, from, to) =>
      client
        .from("workout_sessions")
        .select("id, performed_on")
        .in("id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (sessionsError) {
      throw new Error("Could not load workout sets.");
    }
    for (const session of sessionRows) {
      performedOnBySessionId.set(session.id, session.performed_on.slice(0, 10));
    }
  }

  const sets: MilestoneWorkingSet[] = [];
  for (const row of setRows as SetRow[]) {
    const sessionExercise = exerciseBySessionExerciseId.get(row.session_exercise_id);
    const performedOn = sessionExercise
      ? performedOnBySessionId.get(sessionExercise.session_id)
      : undefined;
    if (!sessionExercise || !performedOn) {
      continue;
    }
    const totalKg = workingSetTotalKg(row.weight_kg, sessionExercise.base_weight_kg);
    if (totalKg == null) {
      continue;
    }
    sets.push({
      exerciseId: sessionExercise.exercise_id,
      reps: row.reps,
      totalKg,
      isWarmup: row.is_warmup,
      performedAt: row.performed_at,
      performedOn,
    });
  }
  return sets;
}

export function coerceKg(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return roundKg(numeric);
}
