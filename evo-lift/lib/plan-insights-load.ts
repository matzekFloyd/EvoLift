import { exerciseMuscleAreas } from "@/lib/muscle-areas";
import {
  buildPlanInsights,
  type PlanActivationSpan,
  type PlanInsightExercise,
  type PlanInsightSession,
  type PlanInsightSet,
  type PlanInsights,
} from "@/lib/plan-insights";
import { formatDateToYyyyMmDd, getTodayYyyyMmDd, normalizeSessionDateOnly } from "@/lib/session-date";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

function calendarDay(timestamp: string): string {
  return formatDateToYyyyMmDd(new Date(timestamp));
}

/** Sessions, sets, and activation dates for one plan, then the insight summary. */
export async function loadPlanInsights(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
): Promise<PlanInsights> {
  const { data: activationRows, error: activationError } = await fetchAllPages((from, to) =>
    client
      .from("workout_plan_activations")
      .select("activated_at, deactivated_at")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .order("activated_at", { ascending: true })
      .range(from, to),
  );
  if (activationError) {
    throw new Error("Could not load plan history.");
  }

  const { data: sessionRows, error: sessionError } = await fetchAllPages((from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on, completed_at")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionError) {
    throw new Error("Could not load plan sessions.");
  }

  const sessions: PlanInsightSession[] = sessionRows.map((row) => ({
    id: row.id,
    performedOn: normalizeSessionDateOnly(row.performed_on),
    completed: row.completed_at != null,
  }));
  const activations: PlanActivationSpan[] = activationRows.map((row) => ({
    activatedOn: calendarDay(row.activated_at),
    deactivatedOn: row.deactivated_at ? calendarDay(row.deactivated_at) : null,
  }));

  const exercises: PlanInsightExercise[] = [];
  const sets: PlanInsightSet[] = [];
  if (sessions.length > 0) {
    const performedOn = new Map(sessions.map((session) => [session.id, session.performedOn]));
    const { data: exerciseRows, error: exerciseError } = await fetchInChunks(
      sessions.map((session) => session.id),
      (chunk, from, to) =>
        client
          .from("workout_session_exercises")
          .select("id, session_id, exercise_id, target_sets, not_done, base_weight_kg")
          .in("session_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
    );
    if (exerciseError) {
      throw new Error("Could not load plan sessions.");
    }

    const exerciseIds = [...new Set(exerciseRows.map((row) => row.exercise_id))];
    const slugById = new Map<string, string>();
    if (exerciseIds.length > 0) {
      const { data: catalogRows, error: catalogError } = await fetchInChunks(exerciseIds, (chunk, from, to) =>
        client.from("exercises").select("id, slug").in("id", chunk).order("id", { ascending: true }).range(from, to),
      );
      if (catalogError) {
        throw new Error("Could not load exercises.");
      }
      for (const row of catalogRows) {
        slugById.set(row.id, row.slug);
      }
    }

    let setRows: Array<{
      session_exercise_id: string | null;
      reps: number;
      weight_kg: number | null;
      is_warmup: boolean;
    }> = [];
    if (exerciseRows.length > 0) {
      const loadedSets = await fetchInChunks(
        exerciseRows.map((row) => row.id),
        (chunk, from, to) =>
          client
            .from("workout_sets")
            .select("session_exercise_id, reps, weight_kg, is_warmup")
            .in("session_exercise_id", chunk)
            .order("id", { ascending: true })
            .range(from, to),
      );
      if (loadedSets.error) {
        throw new Error("Could not load plan sessions.");
      }
      setRows = loadedSets.data;
    }

    const workingSetsByExercise = new Map<string, number>();
    const exerciseById = new Map(exerciseRows.map((row) => [row.id, row]));
    for (const setRow of setRows ?? []) {
      if (!setRow.session_exercise_id || setRow.is_warmup) {
        continue;
      }
      workingSetsByExercise.set(
        setRow.session_exercise_id,
        (workingSetsByExercise.get(setRow.session_exercise_id) ?? 0) + 1,
      );
      const sessionExercise = exerciseById.get(setRow.session_exercise_id);
      const sessionId = sessionExercise?.session_id;
      const slug = sessionExercise ? slugById.get(sessionExercise.exercise_id) : undefined;
      if (!sessionExercise || !sessionId || !slug || setRow.weight_kg == null || setRow.reps <= 0) {
        continue;
      }
      const loaded = Number(setRow.weight_kg);
      const base = Number(sessionExercise.base_weight_kg ?? 0);
      if (!Number.isFinite(loaded) || loaded < 0) {
        continue;
      }
      const totalKg = loaded + (Number.isFinite(base) ? base : 0);
      sets.push({
        sessionId,
        performedOn: performedOn.get(sessionId) ?? "",
        slug,
        reps: setRow.reps,
        totalKg,
        primaryMuscle: exerciseMuscleAreas(slug)?.primary ?? null,
      });
    }

    for (const row of exerciseRows) {
      exercises.push({
        sessionId: row.session_id,
        targetSets: row.target_sets,
        notDone: row.not_done,
        workingSetCount: workingSetsByExercise.get(row.id) ?? 0,
      });
    }
  }

  return buildPlanInsights({
    activations,
    sessions,
    exercises,
    sets,
    today: getTodayYyyyMmDd(),
  });
}
