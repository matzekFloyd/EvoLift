import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";

export type InsightsRange = "4w" | "12w" | "6m" | "all";

type WorkoutSessionRow = {
  id: string;
  performed_on: string;
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

export type InsightsHistory = {
  activity: WorkoutActivityPoint[];
  weekly: WeeklyVolumePoint[];
  exerciseSets: ExerciseWorkingSetSample[];
};

export type InsightsHistoryWindow = {
  from: string;
  to: string;
};

type SessionExerciseDetailRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  base_weight_kg: number | null;
};

type HistorySetRow = {
  session_exercise_id: string | null;
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
};

function addDays(value: string, days: number): string {
  const date = toDateFromYyyyMmDd(value);
  date.setDate(date.getDate() + days);
  return toYyyyMmDd(date);
}

function inclusiveDayCount(from: string, to: string): number {
  const ms = toDateFromYyyyMmDd(to).getTime() - toDateFromYyyyMmDd(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

function endOfWeekSunday(value: string): string {
  const monday = startOfWeekMonday(toDateFromYyyyMmDd(value));
  monday.setDate(monday.getDate() + 6);
  return toYyyyMmDd(monday);
}

/** Dates to read so the selected window and the previous window of the same length are both present. */
function insightsFetchBounds(window: InsightsHistoryWindow): { from: string | null; to: string | null } {
  const { from, to } = window;
  if (from && to && from <= to) {
    const length = inclusiveDayCount(from, to);
    const previousTo = addDays(from, -1);
    const previousFrom = addDays(previousTo, -(length - 1));
    return { from: previousFrom, to: endOfWeekSunday(to) };
  }
  return {
    from: from || null,
    to: to ? endOfWeekSunday(to) : null,
  };
}

function inSelectedWindow(date: string, window: InsightsHistoryWindow): boolean {
  if (window.from && date < window.from) {
    return false;
  }
  if (window.to && date > window.to) {
    return false;
  }
  return true;
}

function insightsHistoryCacheKey(userId: string, window: InsightsHistoryWindow): string {
  return `${userId}|${window.from}|${window.to}`;
}

const insightsHistoryCache = new Map<string, InsightsHistory>();
const insightsHistoryInflight = new Map<string, Promise<InsightsHistory>>();

export function peekInsightsHistory(userId: string, window: InsightsHistoryWindow): InsightsHistory | null {
  return insightsHistoryCache.get(insightsHistoryCacheKey(userId, window)) ?? null;
}

function cachedWindowCovers(cached: InsightsHistoryWindow, requested: InsightsHistoryWindow): boolean {
  const startsEarlyEnough = cached.from === "" || (requested.from !== "" && cached.from <= requested.from);
  const endsLateEnough = cached.to === "" || (requested.to !== "" && cached.to >= requested.to);
  return startsEarlyEnough && endsLateEnough;
}

/** Working sets for a date window already loaded by Insights, including a wider cached window. */
export function peekInsightsExerciseSets(
  userId: string,
  window: InsightsHistoryWindow,
): ExerciseWorkingSetSample[] | null {
  const exact = peekInsightsHistory(userId, window);
  if (exact) {
    return exact.exerciseSets;
  }
  const prefix = `${userId}|`;
  for (const [key, history] of insightsHistoryCache) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const rest = key.slice(prefix.length);
    const splitAt = rest.indexOf("|");
    if (splitAt < 0) {
      continue;
    }
    const cachedWindow = { from: rest.slice(0, splitAt), to: rest.slice(splitAt + 1) };
    if (!cachedWindowCovers(cachedWindow, window)) {
      continue;
    }
    return history.exerciseSets.filter((sample) => inSelectedWindow(sample.performedOn, window));
  }
  return null;
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

export async function loadInsightsHistory(
  client: SupabaseClient<Database>,
  userId: string,
  window: InsightsHistoryWindow,
): Promise<InsightsHistory> {
  const bounds = insightsFetchBounds(window);
  const { data: sessionsData, error: sessionsError } = await fetchAllPages((from, to) => {
    let query = client
      .from("workout_sessions")
      .select("id, performed_on")
      .eq("user_id", userId)
      .order("id", { ascending: true });
    if (bounds.from) {
      query = query.gte("performed_on", bounds.from);
    }
    if (bounds.to) {
      query = query.lte("performed_on", bounds.to);
    }
    return query.range(from, to);
  });
  if (sessionsError) {
    throw new Error(`Could not load workout sessions: ${sessionsError.message}`);
  }

  const sessions = sessionsData as WorkoutSessionRow[];
  const performedOnBySessionId = new Map(
    sessions.map((session) => [session.id, normalizeDateOnly(session.performed_on)]),
  );
  const sessionIds = sessions.map((session) => session.id);
  const setsBySessionId = new Map<string, number>();
  const loadedKgBySessionId = new Map<string, number>();
  const weekly = new Map<string, { volumeKg: number; workingSets: number; sessionIds: Set<string> }>();
  const samples: ExerciseWorkingSetSample[] = [];

  if (sessionIds.length > 0) {
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
    const sessionExercises = sessionExercisesData as SessionExerciseDetailRow[];
    const sessionExerciseIds = sessionExercises.map((row) => row.id);
    const exerciseBySessionExerciseId = new Map(sessionExercises.map((row) => [row.id, row]));

    let sets: HistorySetRow[] = [];
    if (sessionExerciseIds.length > 0) {
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
      sets = setsData as HistorySetRow[];
    }

    const exerciseIds = [...new Set(sessionExercises.map((row) => row.exercise_id))];
    const slugById = new Map<string, string>();
    const labelById = new Map<string, string>();
    if (exerciseIds.length > 0) {
      const { data: exerciseRows, error: exerciseError } = await fetchInChunks(exerciseIds, (chunk, from, to) =>
        client.from("exercises").select("id, slug").in("id", chunk).order("id", { ascending: true }).range(from, to),
      );
      if (exerciseError) {
        throw new Error(`Could not load exercises: ${exerciseError.message}`);
      }
      for (const row of exerciseRows as Array<{ id: string; slug: string }>) {
        slugById.set(row.id, row.slug);
      }
      const { data: translationRows, error: translationError } = await fetchInChunks(
        exerciseIds,
        (chunk, from, to) =>
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
      for (const row of translationRows as Array<{ exercise_id: string; name: string }>) {
        labelById.set(row.exercise_id, row.name);
      }
    }

    for (const setRow of sets) {
      if (!setRow.session_exercise_id) {
        continue;
      }
      const sessionId = exerciseBySessionExerciseId.get(setRow.session_exercise_id)?.session_id;
      if (!sessionId) {
        continue;
      }
      const performedOn = performedOnBySessionId.get(sessionId);
      if (!performedOn) {
        continue;
      }
      setsBySessionId.set(sessionId, (setsBySessionId.get(sessionId) ?? 0) + 1);
      if (setRow.weight_kg != null && setRow.reps > 0) {
        loadedKgBySessionId.set(
          sessionId,
          (loadedKgBySessionId.get(sessionId) ?? 0) + setRow.reps * setRow.weight_kg,
        );
      }
      if (setRow.reps <= 0) {
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

      if (setRow.is_warmup || setRow.weight_kg == null || !inSelectedWindow(performedOn, window)) {
        continue;
      }
      const sessionExercise = exerciseBySessionExerciseId.get(setRow.session_exercise_id);
      if (!sessionExercise) {
        continue;
      }
      const slug = slugById.get(sessionExercise.exercise_id);
      if (!slug) {
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
        sessionId,
        performedOn,
        reps: setRow.reps,
        totalKg,
      });
    }
  }

  const aggregateByDate = new Map<string, { workouts: number; sets: number; loadedKg: number }>();
  for (const session of sessions) {
    const date = normalizeDateOnly(session.performed_on);
    if (!inSelectedWindow(date, window)) {
      continue;
    }
    const current = aggregateByDate.get(date) ?? { workouts: 0, sets: 0, loadedKg: 0 };
    current.workouts += 1;
    current.sets += setsBySessionId.get(session.id) ?? 0;
    current.loadedKg += loadedKgBySessionId.get(session.id) ?? 0;
    aggregateByDate.set(date, current);
  }

  return {
    activity: [...aggregateByDate.entries()]
      .map(([date, value]) => ({
        date,
        workouts: value.workouts,
        sets: value.sets,
        loadedKg: value.loadedKg,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    weekly: [...weekly.entries()]
      .map(([weekStart, value]) => ({
        weekStart,
        volumeKg: Number(value.volumeKg.toFixed(2)),
        workingSets: value.workingSets,
        sessionCount: value.sessionIds.size,
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    exerciseSets: samples,
  };
}

export function loadCachedInsightsHistory(
  client: SupabaseClient<Database>,
  userId: string,
  window: InsightsHistoryWindow,
  options?: { fresh?: boolean },
): Promise<InsightsHistory> {
  const key = insightsHistoryCacheKey(userId, window);
  if (!options?.fresh) {
    const cached = insightsHistoryCache.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }
  }
  const pending = insightsHistoryInflight.get(key);
  if (pending) {
    return pending;
  }
  const request = loadInsightsHistory(client, userId, window)
    .then((history) => {
      insightsHistoryCache.set(key, history);
      insightsHistoryInflight.delete(key);
      return history;
    })
    .catch((error: unknown) => {
      insightsHistoryInflight.delete(key);
      throw error;
    });
  insightsHistoryInflight.set(key, request);
  return request;
}

/** Working sets with a logged load. Total (kg) includes that session's base. */
export async function loadUserExerciseWorkingSets(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<ExerciseWorkingSetSample[]> {
  const history = await loadInsightsHistory(client, userId, { from: "", to: "" });
  return history.exerciseSets;
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
