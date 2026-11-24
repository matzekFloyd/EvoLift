import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LanguageCode } from "@/lib/supabase/database.types";
import {
  REPORT_COOLDOWN_MS,
  REPORT_MIN_SESSIONS,
  REPORT_PAUSED_MESSAGE,
  attachReportSummary,
  buildReportFacts,
  buildReportSummary,
  reportCooldownMessage,
  reportNextCreateAt,
  reportPeriodEnding,
  reportTooFewSessionsMessage,
  sessionCountsForReport,
  type ReportExercise,
  type ReportKind,
  type ReportSession,
} from "@/lib/training-report";
import { ApiHttpError } from "@/server/api/errors";
import { reportAllowanceIsPaused, writeTrainingReport } from "@/server/reports/gateway";

type Client = SupabaseClient<Database>;

export type TrainingReportRow = Database["public"]["Tables"]["training_reports"]["Row"];

type RawSet = {
  reps: number;
  weight_kg: number | null;
  is_warmup: boolean;
  set_number: number;
};

type RawExercise = {
  exercise_id: string;
  position: number;
  notes: string | null;
  not_done: boolean;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  base_weight_kg: number | null;
  workout_sets: RawSet[] | null;
};

type RawSession = {
  performed_on: string;
  notes: string | null;
  completed_at: string | null;
  workout_session_exercises: RawExercise[] | null;
};

function preferredName(
  names: Map<string, Array<{ lang_code: LanguageCode; name: string }>>,
  exerciseId: string,
): string {
  const rows = names.get(exerciseId) ?? [];
  return rows.find((row) => row.lang_code === "en")?.name ?? rows[0]?.name ?? "Exercise";
}

function toReportSession(
  row: RawSession,
  names: Map<string, Array<{ lang_code: LanguageCode; name: string }>>,
): ReportSession {
  const exercises = [...(row.workout_session_exercises ?? [])].sort(
    (left, right) => left.position - right.position,
  );
  const mapped: ReportExercise[] = exercises.map((exercise) => ({
    name: preferredName(names, exercise.exercise_id),
    notes: exercise.notes,
    notDone: exercise.not_done,
    targetSets: exercise.target_sets,
    targetReps: exercise.target_reps,
    targetWeightKg: exercise.target_weight_kg,
    baseWeightKg: exercise.base_weight_kg,
    sets: [...(exercise.workout_sets ?? [])]
      .sort((left, right) => left.set_number - right.set_number)
      .map((set) => ({
        reps: set.reps,
        weightKg: set.weight_kg,
        warmup: set.is_warmup,
      })),
  }));
  return {
    performedOn: row.performed_on.slice(0, 10),
    notes: row.notes,
    completed: row.completed_at != null,
    exercises: mapped,
  };
}

async function loadReportSessions(
  client: Client,
  userId: string,
  period: { from: string; to: string },
  kind: ReportKind,
): Promise<ReportSession[]> {
  let query = client
    .from("workout_sessions")
    .select(
      "performed_on, notes, completed_at, workout_session_exercises(exercise_id, position, notes, not_done, target_sets, target_reps, target_weight_kg, base_weight_kg, workout_sets(reps, weight_kg, is_warmup, set_number))",
    )
    .eq("user_id", userId)
    .lte("performed_on", period.to);
  if (kind === "recent") {
    query = query.gte("performed_on", period.from);
  }
  const { data, error } = await query
    .order("performed_on", { ascending: kind === "recent" })
    .limit(1000);
  if (error) {
    throw new Error(`Could not load sessions for a report: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as RawSession[];
  const exerciseIds = [
    ...new Set(
      rows.flatMap((row) => (row.workout_session_exercises ?? []).map((exercise) => exercise.exercise_id)),
    ),
  ];
  const names = new Map<string, Array<{ lang_code: LanguageCode; name: string }>>();
  if (exerciseIds.length > 0) {
    const { data: translations, error: translationError } = await client
      .from("exercise_translations")
      .select("exercise_id, lang_code, name")
      .in("exercise_id", exerciseIds);
    if (translationError) {
      throw new Error(`Could not load exercise names for a report: ${translationError.message}`);
    }
    for (const row of translations ?? []) {
      const list = names.get(row.exercise_id) ?? [];
      list.push({ lang_code: row.lang_code, name: row.name });
      names.set(row.exercise_id, list);
    }
  }

  const ordered = kind === "all" ? [...rows].reverse() : rows;
  return ordered.map((row) => toReportSession(row, names));
}

export async function listTrainingReports(client: Client, userId: string): Promise<TrainingReportRow[]> {
  const { data, error } = await client
    .from("training_reports")
    .select("id, user_id, period_start, period_end, model, report_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    throw new Error(`Could not load reports: ${error.message}`);
  }
  return data ?? [];
}

export async function listReportsSince(
  client: Client,
  userId: string,
  since: Date,
): Promise<Array<{ report_text: string; created_at: string }>> {
  const { data, error } = await client
    .from("training_reports")
    .select("report_text, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    throw new Error(`Could not load recent reports: ${error.message}`);
  }
  return data ?? [];
}

export async function createTrainingReport(
  client: Client,
  userId: string,
  today: string,
  kind: ReportKind = "recent",
): Promise<TrainingReportRow> {
  const now = new Date();
  const recent = await listReportsSince(client, userId, new Date(now.getTime() - REPORT_COOLDOWN_MS));
  const availableAt = reportNextCreateAt(recent, kind, now);
  if (availableAt) {
    throw new ApiHttpError(429, reportCooldownMessage(kind, availableAt));
  }
  if (await reportAllowanceIsPaused()) {
    throw new ApiHttpError(503, REPORT_PAUSED_MESSAGE);
  }

  const window = kind === "recent" ? reportPeriodEnding(today) : { from: "1970-01-01", to: today };
  const sessions = await loadReportSessions(client, userId, window, kind);
  const counted = sessions.filter(sessionCountsForReport);
  if (counted.length < REPORT_MIN_SESSIONS) {
    throw new ApiHttpError(422, reportTooFewSessionsMessage(kind));
  }
  const period =
    kind === "recent"
      ? window
      : { from: counted[0].performedOn, to: counted[counted.length - 1].performedOn };

  const facts = buildReportFacts({ from: period.from, to: period.to, sessions, kind });
  const summary = buildReportSummary({ from: period.from, to: period.to, sessions, kind });
  const written = await writeTrainingReport(facts, kind);
  const { data, error } = await client
    .from("training_reports")
    .insert({
      user_id: userId,
      period_start: period.from,
      period_end: period.to,
      model: written.model,
      report_text: attachReportSummary(written.text, summary),
    })
    .select("id, user_id, period_start, period_end, model, report_text, created_at")
    .single();
  if (error) {
    throw new Error(`Could not save the report: ${error.message}`);
  }
  return data;
}
