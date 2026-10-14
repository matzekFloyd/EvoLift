import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";

export type InsightsRange = "4w" | "12w" | "6m" | "all";

type WorkoutSessionRow = {
  id: string;
  performed_on: string;
};

type SessionExerciseRow = {
  id: string;
  session_id: string;
};

type WorkoutSetLinkRow = {
  session_exercise_id: string | null;
  reps: number;
  weight_kg: number | null;
};

export type WorkoutActivityPoint = {
  date: string;
  workouts: number;
  sets: number;
  loadedKg: number;
};

export type WeeklyVolumePoint = {
  weekStart: string;
  volumeKg: number;
  workingSets: number;
  sessionCount: number;
};

function toYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateOnly(value: string): string {
  return value.slice(0, 10);
}

function toDateFromYyyyMmDd(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function startOfWeekMonday(value: Date): Date {
  const date = new Date(value);
  const dayOfWeek = date.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() - offsetToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getRangeStart(range: InsightsRange, today: Date): string | null {
  const start = new Date(today);
  if (range === "4w") {
    start.setDate(start.getDate() - 27);
    return toYyyyMmDd(start);
  }
  if (range === "12w") {
    start.setDate(start.getDate() - 83);
    return toYyyyMmDd(start);
  }
  if (range === "6m") {
    start.setMonth(start.getMonth() - 6);
    return toYyyyMmDd(start);
  }
  return null;
}

export async function loadUserWorkoutActivityBase(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkoutActivityPoint[]> {
  const { data: sessionsData, error: sessionsError } = await fetchAllPages((from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionsError) {
    throw new Error(`Could not load workout sessions: ${sessionsError.message}`);
  }

  const sessions = sessionsData as WorkoutSessionRow[];
  const sessionIds = sessions.map((row) => row.id);
  const setsBySessionId = new Map<string, number>();
  const loadedKgBySessionId = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: sessionExercisesData, error: sessionExercisesError } = await fetchInChunks(
      sessionIds,
      (chunk, from, to) =>
        client
          .from("workout_session_exercises")
          .select("id, session_id")
          .in("session_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
    );
    if (sessionExercisesError) {
      throw new Error(`Could not load session exercises: ${sessionExercisesError.message}`);
    }
    const sessionExercises = sessionExercisesData as SessionExerciseRow[];
    const sessionExerciseIds = sessionExercises.map((row) => row.id);
    const sessionIdBySessionExerciseId = new Map<string, string>();
    for (const row of sessionExercises) {
      sessionIdBySessionExerciseId.set(row.id, row.session_id);
    }

    if (sessionExerciseIds.length > 0) {
      const { data: setsData, error: setsError } = await fetchInChunks(sessionExerciseIds, (chunk, from, to) =>
        client
          .from("workout_sets")
          .select("session_exercise_id, reps, weight_kg")
          .in("session_exercise_id", chunk)
          .order("id", { ascending: true })
          .range(from, to),
      );
      if (setsError) {
        throw new Error(`Could not load workout sets: ${setsError.message}`);
      }
      for (const row of setsData as WorkoutSetLinkRow[]) {
        if (!row.session_exercise_id) {
          continue;
        }
        const sessionId = sessionIdBySessionExerciseId.get(row.session_exercise_id);
        if (!sessionId) {
          continue;
        }
        setsBySessionId.set(sessionId, (setsBySessionId.get(sessionId) ?? 0) + 1);
        if (row.weight_kg != null && row.reps > 0) {
          loadedKgBySessionId.set(
            sessionId,
            (loadedKgBySessionId.get(sessionId) ?? 0) + row.reps * row.weight_kg,
          );
        }
      }
    }
  }

  const aggregateByDate = new Map<string, { workouts: number; sets: number; loadedKg: number }>();
  for (const session of sessions) {
    const date = normalizeDateOnly(session.performed_on);
    const current = aggregateByDate.get(date) ?? { workouts: 0, sets: 0, loadedKg: 0 };
    current.workouts += 1;
    current.sets += setsBySessionId.get(session.id) ?? 0;
    current.loadedKg += loadedKgBySessionId.get(session.id) ?? 0;
    aggregateByDate.set(date, current);
  }

  return [...aggregateByDate.entries()]
    .map(([date, value]) => ({
      date,
      workouts: value.workouts,
      sets: value.sets,
      loadedKg: value.loadedKg,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function applyInsightsRange(
  points: WorkoutActivityPoint[],
  range: InsightsRange,
): WorkoutActivityPoint[] {
  if (points.length === 0) {
    return [];
  }
  const today = new Date();
  const todayKey = toYyyyMmDd(today);
  const start = getRangeStart(range, today);
  return points.filter((point) => {
    if (point.date > todayKey) {
      return false;
    }
    if (!start) {
      return true;
    }
    return point.date >= start;
  });
}

export async function loadUserWeeklyVolumeBase(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WeeklyVolumePoint[]> {
  const { data: sessionsData, error: sessionsError } = await fetchAllPages((from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionsError) {
    throw new Error(`Could not load workout sessions: ${sessionsError.message}`);
  }
  const sessions = sessionsData as WorkoutSessionRow[];
  const sessionIds = sessions.map((row) => row.id);
  if (sessionIds.length === 0) {
    return [];
  }

  const performedOnBySessionId = new Map<string, string>();
  for (const session of sessions) {
    performedOnBySessionId.set(session.id, normalizeDateOnly(session.performed_on));
  }

  const { data: sessionExercisesData, error: sessionExercisesError } = await fetchInChunks(
    sessionIds,
    (chunk, from, to) =>
      client
        .from("workout_session_exercises")
        .select("id, session_id")
        .in("session_id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionExercisesError) {
    throw new Error(`Could not load session exercises: ${sessionExercisesError.message}`);
  }
  const sessionExercises = sessionExercisesData as SessionExerciseRow[];
  const sessionExerciseIds = sessionExercises.map((row) => row.id);
  if (sessionExerciseIds.length === 0) {
    return [];
  }

  const sessionIdBySessionExerciseId = new Map<string, string>();
  for (const row of sessionExercises) {
    sessionIdBySessionExerciseId.set(row.id, row.session_id);
  }

  const { data: setsData, error: setsError } = await fetchInChunks(sessionExerciseIds, (chunk, from, to) =>
    client
      .from("workout_sets")
      .select("session_exercise_id, reps, weight_kg, is_warmup")
      .in("session_exercise_id", chunk)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (setsError) {
    throw new Error(`Could not load workout sets: ${setsError.message}`);
  }

  const weekly = new Map<string, { volumeKg: number; workingSets: number; sessionIds: Set<string> }>();
  for (const setRow of setsData as Array<{
    session_exercise_id: string | null;
    reps: number;
    weight_kg: number | null;
    is_warmup: boolean;
  }>) {
    if (!setRow.session_exercise_id || setRow.reps <= 0) {
      continue;
    }
    const sessionId = sessionIdBySessionExerciseId.get(setRow.session_exercise_id);
    if (!sessionId) {
      continue;
    }
    const performedOn = performedOnBySessionId.get(sessionId);
    if (!performedOn) {
      continue;
    }
    const weekStart = toYyyyMmDd(startOfWeekMonday(toDateFromYyyyMmDd(performedOn)));
    const entry = weekly.get(weekStart) ?? {
      volumeKg: 0,
      workingSets: 0,
      sessionIds: new Set<string>(),
    };
    if (setRow.weight_kg != null) {
      entry.volumeKg += setRow.reps * setRow.weight_kg;
    }
    if (!setRow.is_warmup) {
      entry.workingSets += 1;
    }
    entry.sessionIds.add(sessionId);
    weekly.set(weekStart, entry);
  }

  return [...weekly.entries()]
    .map(([weekStart, value]) => ({
      weekStart,
      volumeKg: Number(value.volumeKg.toFixed(2)),
      workingSets: value.workingSets,
      sessionCount: value.sessionIds.size,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export type ExerciseWorkingSetSample = {
  exerciseId: string;
  slug: string;
  label: string;
  sessionId: string;
  performedOn: string;
  reps: number;
  totalKg: number;
};

/** Working sets with a logged load. Total (kg) includes that session's base. */
export async function loadUserExerciseWorkingSets(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ExerciseWorkingSetSample[]> {
  const { data: sessionsData, error: sessionsError } = await fetchAllPages((from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (sessionsError) {
    throw new Error(`Could not load workout sessions: ${sessionsError.message}`);
  }
  const sessions = sessionsData as WorkoutSessionRow[];
  if (sessions.length === 0) {
    return [];
  }
  const performedOnBySessionId = new Map(
    sessions.map((session) => [session.id, normalizeDateOnly(session.performed_on)]),
  );
  const sessionIds = sessions.map((session) => session.id);

  const { data: sessionExercisesData, error: sessionExercisesError } = await fetchInChunks(
    sessionIds,
    (chunk, from, to) =>
      client
        .from("workout_session_exercises")
        .select("id, session_id, exercise_id, base_weight_kg")
        .in("session_id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
  );
  if (sessionExercisesError) {
    throw new Error(`Could not load session exercises: ${sessionExercisesError.message}`);
  }
  const sessionExercises = sessionExercisesData as Array<{
    id: string;
    session_id: string;
    exercise_id: string;
    base_weight_kg: number | null;
  }>;
  if (sessionExercises.length === 0) {
    return [];
  }

  const sessionExerciseIds = sessionExercises.map((row) => row.id);
  const { data: setsData, error: setsError } = await fetchInChunks(sessionExerciseIds, (chunk, from, to) =>
    client
      .from("workout_sets")
      .select("session_exercise_id, reps, weight_kg, is_warmup")
      .in("session_exercise_id", chunk)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (setsError) {
    throw new Error(`Could not load workout sets: ${setsError.message}`);
  }

  const exerciseIds = [...new Set(sessionExercises.map((row) => row.exercise_id))];
  const { data: exerciseRows, error: exerciseError } = await fetchInChunks(exerciseIds, (chunk, from, to) =>
    client.from("exercises").select("id, slug").in("id", chunk).order("id", { ascending: true }).range(from, to),
  );
  if (exerciseError) {
    throw new Error(`Could not load exercises: ${exerciseError.message}`);
  }
  const { data: translationRows, error: translationError } = await fetchInChunks(exerciseIds, (chunk, from, to) =>
    client
      .from("exercise_translations")
      .select("exercise_id, name")
      .eq("lang_code", "en")
      .in("exercise_id", chunk)
      .order("exercise_id", { ascending: true })
      .range(from, to),
  );
  if (translationError) {
    throw new Error(`Could not load exercise names: ${translationError.message}`);
  }

  const slugById = new Map(
    ((exerciseRows ?? []) as Array<{ id: string; slug: string }>).map((row) => [row.id, row.slug]),
  );
  const labelById = new Map(
    ((translationRows ?? []) as Array<{ exercise_id: string; name: string }>).map((row) => [
      row.exercise_id,
      row.name,
    ]),
  );
  const exerciseBySessionExerciseId = new Map(
    sessionExercises.map((row) => [row.id, row]),
  );

  const samples: ExerciseWorkingSetSample[] = [];
  for (const setRow of setsData as Array<{
    session_exercise_id: string | null;
    reps: number;
    weight_kg: number | null;
    is_warmup: boolean;
  }>) {
    if (!setRow.session_exercise_id || setRow.is_warmup || setRow.weight_kg == null || setRow.reps < 1) {
      continue;
    }
    const sessionExercise = exerciseBySessionExerciseId.get(setRow.session_exercise_id);
    if (!sessionExercise) {
      continue;
    }
    const performedOn = performedOnBySessionId.get(sessionExercise.session_id);
    const slug = slugById.get(sessionExercise.exercise_id);
    if (!performedOn || !slug) {
      continue;
    }
    const loaded = Number(setRow.weight_kg);
    const base = Number(sessionExercise.base_weight_kg ?? 0);
    if (!Number.isFinite(loaded) || loaded < 0) {
      continue;
    }
    const totalKg = loaded + (Number.isFinite(base) ? base : 0);
    if (totalKg <= 0) {
      continue;
    }
    samples.push({
      exerciseId: sessionExercise.exercise_id,
      slug,
      label: labelById.get(sessionExercise.exercise_id) ?? slug,
      sessionId: sessionExercise.session_id,
      performedOn,
      reps: setRow.reps,
      totalKg,
    });
  }
  return samples;
}

export type UserStrengthProfile = {
  sex: "female" | "male" | null;
  bodyweightKg: number | null;
  dateOfBirth: string | null;
  birthYear: number | null;
};

export async function loadUserStrengthProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserStrengthProfile> {
  const { data, error } = await client
    .from("user_profile_metrics")
    .select("bodyweight_kg, sex, date_of_birth, birth_year")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }
  const bodyweight = data?.bodyweight_kg;
  const sex = data?.sex === "female" || data?.sex === "male" ? data.sex : null;
  return {
    sex,
    bodyweightKg: bodyweight == null || !Number.isFinite(Number(bodyweight)) ? null : Number(bodyweight),
    dateOfBirth: data?.date_of_birth ?? null,
    birthYear: data?.birth_year ?? null,
  };
}
