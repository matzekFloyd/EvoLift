import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMilestoneTarget } from "@/lib/milestone-progress";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";
import { fetchWorkoutSessionsByIds } from "@/lib/workout-sessions-by-ids";

type Client = SupabaseClient<Database>;

export type ExerciseHistorySet = {
  sessionId: string;
  performedOn: string;
  sessionCreatedAt: string;
  performedAt: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  totalKg: number;
  isWarmup: boolean;
  goalLabel: string | null;
};

export async function loadExerciseHistory(
  client: Client,
  userId: string,
  slug: string,
): Promise<{ id: string; slug: string; name: string; sets: ExerciseHistorySet[] } | null> {
  const { data: exercise, error: exerciseError } = await client
    .from("exercises")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (exerciseError) {
    throw new Error(`Could not load exercise: ${exerciseError.message}`);
  }
  if (!exercise) {
    return null;
  }
  const { data: translation } = await client
    .from("exercise_translations")
    .select("name")
    .eq("exercise_id", exercise.id)
    .eq("lang_code", "en")
    .maybeSingle();

  const { data: sessionExercises, error: sessionExercisesError } = await fetchAllPages((from, to) =>
    client
      .from("workout_session_exercises")
      .select("id, session_id, base_weight_kg")
      .eq("exercise_id", exercise.id)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionExercisesError) {
    throw new Error("Could not load exercise sessions.");
  }

  const sessionIds = [...new Set(sessionExercises.map((row) => row.session_id))];
  const baseBySessionExercise = new Map(
    sessionExercises.map((row) => [row.id, row.base_weight_kg == null ? 0 : Number(row.base_weight_kg)]),
  );
  const sessionIdBySessionExercise = new Map(sessionExercises.map((row) => [row.id, row.session_id]));

  const sessionsResult =
    sessionIds.length === 0
      ? { data: [], error: null }
      : await fetchWorkoutSessionsByIds(client, sessionIds, userId);
  if (sessionsResult.error) {
    throw new Error("Could not load your workout sessions.");
  }
  const sessions = sessionsResult.data;
  const sessionMeta = new Map(
    sessions.map((row) => [
      row.id,
      { performedOn: row.performed_on.slice(0, 10), createdAt: row.created_at },
    ]),
  );

  const ownedSessionExerciseIds = sessionExercises
    .filter((row) => sessionMeta.has(row.session_id))
    .map((row) => row.id);
  const setsResult =
    ownedSessionExerciseIds.length === 0
      ? { data: [], error: null }
      : await fetchInChunks(ownedSessionExerciseIds, (chunk, from, to) =>
          client
            .from("workout_sets")
            .select("session_exercise_id, set_number, reps, weight_kg, is_warmup, performed_at")
            .in("session_exercise_id", chunk)
            .order("id", { ascending: true })
            .range(from, to),
        );
  if (setsResult.error) {
    throw new Error("Could not load exercise sets.");
  }
  const sets = setsResult.data;

  const { data: milestones, error: milestonesError } = await client
    .from("strength_milestones")
    .select("milestone_type, target_weight_kg, bodyweight_multiple, min_reps, achieved_at")
    .eq("user_id", userId)
    .eq("exercise_id", exercise.id)
    .not("achieved_at", "is", null);
  if (milestonesError) {
    throw new Error("Could not load goals.");
  }
  const goalLabelsByAchievedAt = new Map<number, string[]>();
  for (const milestone of milestones ?? []) {
    if (!milestone.achieved_at) {
      continue;
    }
    const achievedAtMs = new Date(milestone.achieved_at).getTime();
    if (!Number.isFinite(achievedAtMs)) {
      continue;
    }
    const label = formatMilestoneTarget({
      exerciseId: exercise.id,
      milestoneType: milestone.milestone_type,
      targetWeightKg: milestone.target_weight_kg == null ? null : Number(milestone.target_weight_kg),
      bodyweightMultiple:
        milestone.bodyweight_multiple == null ? null : Number(milestone.bodyweight_multiple),
      minReps: milestone.min_reps,
    });
    const labels = goalLabelsByAchievedAt.get(achievedAtMs) ?? [];
    labels.push(label);
    goalLabelsByAchievedAt.set(achievedAtMs, labels);
  }

  const history: ExerciseHistorySet[] = [];
  for (const setRow of sets) {
    const sessionId = sessionIdBySessionExercise.get(setRow.session_exercise_id);
    const meta = sessionId ? sessionMeta.get(sessionId) : undefined;
    if (!sessionId || !meta) {
      continue;
    }
    const base = baseBySessionExercise.get(setRow.session_exercise_id) ?? 0;
    const loaded = setRow.weight_kg == null ? 0 : Number(setRow.weight_kg);
    const baseKg = Number.isFinite(base) ? base : 0;
    const loadedKg = Number.isFinite(loaded) ? loaded : 0;
    const performedAtMs = new Date(setRow.performed_at).getTime();
    const goalLabels = Number.isFinite(performedAtMs) ? goalLabelsByAchievedAt.get(performedAtMs) : undefined;
    history.push({
      sessionId,
      performedOn: meta.performedOn,
      sessionCreatedAt: meta.createdAt,
      performedAt: setRow.performed_at,
      setNumber: setRow.set_number,
      reps: setRow.reps,
      weightKg: setRow.weight_kg == null ? null : Number(setRow.weight_kg),
      totalKg: loadedKg + baseKg,
      isWarmup: setRow.is_warmup,
      goalLabel: goalLabels && goalLabels.length > 0 ? goalLabels.join(", ") : null,
    });
  }

  return {
    id: exercise.id,
    slug: exercise.slug,
    name: translation?.name ?? exercise.slug,
    sets: history,
  };
}
