import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMilestoneTarget, type MilestoneType } from "@/lib/milestone-progress";
import { fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type ReachedGoal = {
  exerciseId: string;
  achievedAt: string;
  label: string;
};

type ReachedSet = {
  exerciseId: string;
  performedAt: string;
  performedOn: string;
};

function instantKey(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function localDateKey(value: string): string | null {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Session dates for reached goals, keyed to the workout day of the set that reached each one. */
export function reachedGoalLabelsBySessionDate(
  goals: ReachedGoal[],
  sets: ReachedSet[],
): Record<string, string> {
  const setsByInstant = new Map<number, ReachedSet[]>();
  for (const set of sets) {
    const key = instantKey(set.performedAt);
    if (key == null) {
      continue;
    }
    const group = setsByInstant.get(key) ?? [];
    group.push(set);
    setsByInstant.set(key, group);
  }

  const labelsByDate = new Map<string, string[]>();
  for (const goal of goals) {
    const key = instantKey(goal.achievedAt);
    const match =
      key == null
        ? undefined
        : setsByInstant.get(key)?.find((set) => set.exerciseId === goal.exerciseId);
    const date = match?.performedOn.slice(0, 10) ?? localDateKey(goal.achievedAt);
    if (!date) {
      continue;
    }
    const labels = labelsByDate.get(date) ?? [];
    if (!labels.includes(goal.label)) {
      labels.push(goal.label);
    }
    labelsByDate.set(date, labels);
  }

  return Object.fromEntries(
    [...labelsByDate].map(([date, labels]) => [date, labels.join(", ")]),
  );
}

/** Dates in `YYYY-MM-DD` form, with the goal names reached that day. */
export async function loadGoalReachedSessionDates(client: Client): Promise<Record<string, string>> {
  const { data, error } = await client
    .from("strength_milestones")
    .select("exercise_id, milestone_type, target_weight_kg, bodyweight_multiple, min_reps, achieved_at")
    .not("achieved_at", "is", null);
  if (error || !data || data.length === 0) {
    return {};
  }

  const goals: ReachedGoal[] = [];
  for (const row of data) {
    if (!row.achieved_at) {
      continue;
    }
    goals.push({
      exerciseId: row.exercise_id,
      achievedAt: row.achieved_at,
      label: formatMilestoneTarget({
        exerciseId: row.exercise_id,
        milestoneType: row.milestone_type as MilestoneType,
        targetWeightKg: row.target_weight_kg == null ? null : Number(row.target_weight_kg),
        bodyweightMultiple:
          row.bodyweight_multiple == null ? null : Number(row.bodyweight_multiple),
        minReps: row.min_reps,
      }),
    });
  }
  if (goals.length === 0) {
    return {};
  }

  const achievedAts = [...new Set(goals.map((goal) => goal.achievedAt))];
  const { data: setRows, error: setsError } = await fetchInChunks(achievedAts, (chunk, from, to) =>
    client
      .from("workout_sets")
      .select("performed_at, session_exercise_id")
      .in("performed_at", chunk)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (setsError || setRows.length === 0) {
    return reachedGoalLabelsBySessionDate(goals, []);
  }

  const sessionExerciseIds = [...new Set(setRows.map((row) => row.session_exercise_id))];
  const { data: sessionExerciseRows, error: sessionExercisesError } = await fetchInChunks(
    sessionExerciseIds,
    (chunk, from, to) =>
      client
        .from("workout_session_exercises")
        .select("id, exercise_id, session_id")
        .in("id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionExercisesError) {
    return reachedGoalLabelsBySessionDate(goals, []);
  }

  const sessionIds = [...new Set(sessionExerciseRows.map((row) => row.session_id))];
  const { data: sessionRows, error: sessionsError } = await fetchInChunks(sessionIds, (chunk, from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on")
      .in("id", chunk)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionsError) {
    return reachedGoalLabelsBySessionDate(goals, []);
  }

  const sessionExerciseById = new Map(sessionExerciseRows.map((row) => [row.id, row]));
  const performedOnBySessionId = new Map(
    sessionRows.map((row) => [row.id, row.performed_on.slice(0, 10)]),
  );
  const sets: ReachedSet[] = [];
  for (const setRow of setRows) {
    const sessionExercise = sessionExerciseById.get(setRow.session_exercise_id);
    if (!sessionExercise) {
      continue;
    }
    const performedOn = performedOnBySessionId.get(sessionExercise.session_id);
    if (!performedOn) {
      continue;
    }
    sets.push({
      exerciseId: sessionExercise.exercise_id,
      performedAt: setRow.performed_at,
      performedOn,
    });
  }

  return reachedGoalLabelsBySessionDate(goals, sets);
}
