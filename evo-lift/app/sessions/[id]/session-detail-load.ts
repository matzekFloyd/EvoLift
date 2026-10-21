import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import type { OpenedSessionSnapshot } from "@/lib/opened-session-cache";
import type { createPageLoadPerfTracker } from "@/lib/page-load-perf";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { SessionExerciseRow, SessionRow, WorkoutSetRow } from "./session-detail-actions";
import {
  buildSessionSnapshot,
  computeSessionNumber,
  type SessionJoinedNames,
} from "./session-detail-snapshot";

export type SessionSnapshotLoadResult =
  | { status: "cancelled" }
  | { status: "error"; message: string }
  | { status: "ok"; snapshot: OpenedSessionSnapshot };

/**
 * Loads one session and everything the detail page needs, in the same query order as before.
 * `isActive` reports whether the caller is still mounted; a stale load resolves as `cancelled`.
 */
export async function loadSessionSnapshot(input: {
  perf: ReturnType<typeof createPageLoadPerfTracker>;
  sessionId: string;
  authUserId: string;
  isActive: () => boolean;
}): Promise<SessionSnapshotLoadResult> {
  const { perf, sessionId, authUserId, isActive } = input;

  const { data: sessionData, error: sessionError } = await perf.trackQuery(
    "workout_sessions.selectById",
    () =>
      supabaseBrowserClient
        .from("workout_sessions")
        .select(
          "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, started_at, completed_at, workout_templates(name), workout_plans(name), workout_plan_days(name)",
        )
        .eq("id", sessionId)
        .single(),
  );

  if (!isActive()) {
    return { status: "cancelled" };
  }
  if (sessionError || !sessionData) {
    return { status: "error", message: "Could not load workout session." };
  }

  if (sessionData.user_id !== authUserId) {
    return { status: "error", message: "You do not have access to this workout session." };
  }

  // These reads only need the session row. Sets wait until session-exercise ids exist.
  perf.noteCache("exerciseMetadata", getExerciseMetadataCacheStatus(5 * 60 * 1000));
  const priorSessionsPromise = perf.trackQuery("workout_sessions.countPriorByCreatedAt", () =>
    supabaseBrowserClient
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authUserId)
      .lt("created_at", sessionData.created_at),
  );
  const sameCreatedAtPromise = perf.trackQuery("workout_sessions.selectSameCreatedAtIds", () =>
    supabaseBrowserClient
      .from("workout_sessions")
      .select("id")
      .eq("user_id", authUserId)
      .eq("created_at", sessionData.created_at)
      .order("id", { ascending: true }),
  );
  const sessionExercisesPromise = perf.trackQuery(
    "workout_session_exercises.selectBySessionId",
    () =>
      supabaseBrowserClient
        .from("workout_session_exercises")
        .select(
          "id, session_id, exercise_id, position, base_weight_kg, target_sets, target_reps, target_weight_kg, notes, not_done, created_at",
        )
        .eq("session_id", sessionId)
        .order("position", { ascending: true }),
  );
  const metadataPromise = perf
    .trackQuery("exerciseMetadata.load", () =>
      loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 }),
    )
    .then(
      (rows) => ({ rows, error: null as unknown }),
      (error: unknown) => ({
        rows: [] as Array<{ id: string; slug: string; label: string }>,
        error,
      }),
    );
  const hiddenPromise = perf.trackQuery("user_hidden_exercises.selectByUserId", () =>
    supabaseBrowserClient
      .from("user_hidden_exercises")
      .select("exercise_id")
      .eq("user_id", authUserId),
  );

  const sessionExerciseResult = await sessionExercisesPromise;
  const sessionExerciseData = (sessionExerciseResult.data ?? []) as SessionExerciseRow[];
  const sessionExerciseIds = sessionExerciseData.map((row) => row.id);
  const setsPromise =
    sessionExerciseResult.error || sessionExerciseIds.length === 0
      ? Promise.resolve({ data: [] as WorkoutSetRow[], error: null })
      : perf.trackQuery("workout_sets.selectBySessionExerciseIds", () =>
          supabaseBrowserClient
            .from("workout_sets")
            .select(
              "id, session_exercise_id, set_number, reps, weight_kg, is_warmup, performed_at, notes, created_at",
            )
            .in("session_exercise_id", sessionExerciseIds)
            .order("set_number", { ascending: true }),
        );

  const [priorResult, sameCreatedAtResult, metadataResult, hiddenResult, setsResult] =
    await Promise.all([
      priorSessionsPromise,
      sameCreatedAtPromise,
      metadataPromise,
      hiddenPromise,
      setsPromise,
    ]);

  if (!isActive()) {
    return { status: "cancelled" };
  }
  if (priorResult.error || sameCreatedAtResult.error) {
    return { status: "error", message: "Could not compute session number." };
  }
  if (sessionExerciseResult.error) {
    return { status: "error", message: "Could not load session exercises." };
  }
  if (setsResult.error) {
    return { status: "error", message: "Could not load workout sets." };
  }
  if (metadataResult.error) {
    const metadataError = metadataResult.error;
    return {
      status: "error",
      message:
        metadataError instanceof Error ? metadataError.message : "Could not load exercise options.",
    };
  }
  if (hiddenResult.error) {
    return { status: "error", message: "Could not load exercise visibility." };
  }

  const sessionRow = sessionData as SessionRow;
  return {
    status: "ok",
    snapshot: buildSessionSnapshot({
      sessionRow,
      joined: sessionData as unknown as SessionJoinedNames,
      sessionExercises: sessionExerciseData,
      workoutSets: (setsResult.data ?? []) as WorkoutSetRow[],
      sessionNumber: computeSessionNumber(
        priorResult.count,
        (sameCreatedAtResult.data ?? []) as Array<{ id: string }>,
        sessionData.id,
      ),
      exerciseMetadata: metadataResult.rows,
      hiddenExerciseRows: hiddenResult.data ?? [],
    }),
  };
}
