import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AccountTransferError,
  prepareAccountImport,
  type AccountImportMode,
  type AccountTransfer,
  type ExistingAccountData,
} from "@/lib/account-transfer";
import type { Json } from "@/lib/supabase/database.types";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/chunked-query";
import type { Database } from "@/lib/supabase/database.types";
import { OPEN_SESSION_LIMIT_MESSAGE } from "@/lib/session-lifecycle";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import { ApiHttpError } from "@/server/api/http";

type Client = SupabaseClient<Database>;

const IMPORT_CONFLICT_MESSAGES = [
  "A template with this name is already in this account.",
  "A plan with this name is already in this account.",
  "That date already has a bodyweight.",
  "This file conflicts with data already in this account.",
  OPEN_SESSION_LIMIT_MESSAGE,
  "You must be logged in.",
  "Choose add or replace.",
  "This file is not an EvoLift account export.",
] as const;

export async function loadAccountTransfer(client: Client, userId: string): Promise<AccountTransfer> {
  const slugById = await loadSlugsById(client);
  const [profile, bodyweight, hidden, defaults, templates, plans, sessions, goals] = await Promise.all([
    loadProfile(client, userId),
    loadBodyweight(client, userId),
    loadHidden(client, userId, slugById),
    loadDefaults(client, userId, slugById),
    loadTemplates(client, userId, slugById),
    loadPlans(client, userId, slugById),
    loadSessions(client, userId, slugById),
    loadGoals(client, userId, slugById),
  ]);
  const templateRefs = new Set(templates.map((template) => template.ref));
  const planRefs = new Set(plans.map((plan) => plan.ref));
  const dayRefs = new Set(plans.flatMap((plan) => plan.days.map((day) => day.ref)));
  return {
    format: "evolift-account",
    version: 1,
    profile,
    bodyweightLog: bodyweight,
    hiddenExercises: hidden,
    exerciseDefaults: defaults,
    templates,
    plans,
    sessions: sessions.map((session) => ({
      ...session,
      templateRef: session.templateRef && templateRefs.has(session.templateRef) ? session.templateRef : null,
      planRef: session.planRef && planRefs.has(session.planRef) ? session.planRef : null,
      planDayRef: session.planDayRef && dayRefs.has(session.planDayRef) ? session.planDayRef : null,
    })),
    goals,
  };
}

export async function importAccountDocument(
  client: Client,
  userId: string,
  document: AccountTransfer,
  mode: AccountImportMode,
): Promise<{ skippedExercises: string[] }> {
  const [catalog, existing] = await Promise.all([
    loadCatalog(client),
    loadExistingAccountData(client, userId),
  ]);
  let prepared: ReturnType<typeof prepareAccountImport>;
  try {
    prepared = prepareAccountImport({
      document,
      mode,
      catalog,
      existing,
      today: getTodayYyyyMmDd(),
    });
  } catch (error) {
    throw asTransferHttpError(error);
  }
  const { error } = await client.rpc("import_account_transfer", {
    p_user_id: userId,
    p_payload: prepared.payload as Json,
  });
  if (error) {
    const known = IMPORT_CONFLICT_MESSAGES.find((message) => error.message.includes(message));
    if (known) {
      throw new ApiHttpError(400, known);
    }
    throw new Error(`Could not import account data: ${error.message}`);
  }
  return { skippedExercises: prepared.skippedExercises };
}

async function loadExistingAccountData(client: Client, userId: string): Promise<ExistingAccountData> {
  const [profile, bodyweight, hidden, defaults, templates, plans, openSessions] = await Promise.all([
    client
      .from("user_profile_metrics")
      .select("bodyweight_kg, height_cm, sex, date_of_birth")
      .eq("user_id", userId)
      .maybeSingle(),
    fetchAllPages((from, to) =>
      client
        .from("user_bodyweight_log")
        .select("logged_on")
        .eq("user_id", userId)
        .order("logged_on", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      client
        .from("user_hidden_exercises")
        .select("exercise_id")
        .eq("user_id", userId)
        .order("exercise_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      client
        .from("user_exercise_defaults")
        .select("exercise_id")
        .eq("user_id", userId)
        .order("exercise_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      client
        .from("workout_templates")
        .select("name")
        .eq("user_id", userId)
        .order("name", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      client
        .from("workout_plans")
        .select("name, is_active")
        .eq("user_id", userId)
        .order("name", { ascending: true })
        .range(from, to),
    ),
    client
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("started_at", "is", null)
      .is("completed_at", null),
  ]);
  for (const result of [profile, bodyweight, hidden, defaults, templates, plans, openSessions]) {
    if (result.error) {
      throw new Error(`Could not read account data: ${result.error.message}`);
    }
  }
  return {
    profile: profile.data
      ? {
          bodyweightKg: kg(profile.data.bodyweight_kg),
          heightCm: kg(profile.data.height_cm),
          sex: profile.data.sex === "female" || profile.data.sex === "male" ? profile.data.sex : null,
          dateOfBirth: profile.data.date_of_birth ? profile.data.date_of_birth.slice(0, 10) : null,
        }
      : null,
    bodyweightDates: (bodyweight.data ?? []).map((row) => row.logged_on.slice(0, 10)),
    hiddenExerciseIds: (hidden.data ?? []).map((row) => row.exercise_id),
    defaultExerciseIds: (defaults.data ?? []).map((row) => row.exercise_id),
    templateNames: (templates.data ?? []).map((row) => row.name),
    planNames: (plans.data ?? []).map((row) => row.name),
    hasActivePlan: (plans.data ?? []).some((row) => row.is_active),
    openSessionCount: openSessions.count ?? 0,
  };
}

async function loadCatalog(client: Client): Promise<Map<string, string>> {
  const { data, error } = await fetchAllPages((from, to) =>
    client.from("exercises").select("id, slug").order("slug", { ascending: true }).range(from, to),
  );
  if (error) {
    throw new Error(`Could not load exercises: ${error.message}`);
  }
  return new Map((data ?? []).map((row) => [row.slug, row.id]));
}

async function loadSlugsById(client: Client): Promise<Map<string, string>> {
  const catalog = await loadCatalog(client);
  return new Map([...catalog].map(([slug, id]) => [id, slug]));
}

async function loadProfile(client: Client, userId: string): Promise<AccountTransfer["profile"]> {
  const [{ data, error }, entries] = await Promise.all([
    client
      .from("user_profile_metrics")
      .select("bodyweight_kg, height_cm, sex, date_of_birth")
      .eq("user_id", userId)
      .maybeSingle(),
    loadBodyweight(client, userId),
  ]);
  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }
  const latest = [...entries].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn)).at(-1);
  return {
    bodyweightKg: latest?.bodyweightKg ?? kg(data?.bodyweight_kg ?? null),
    heightCm: kg(data?.height_cm ?? null),
    sex: data?.sex === "female" || data?.sex === "male" ? data.sex : null,
    dateOfBirth: data?.date_of_birth ? data.date_of_birth.slice(0, 10) : null,
  };
}

async function loadBodyweight(client: Client, userId: string): Promise<AccountTransfer["bodyweightLog"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("user_bodyweight_log")
      .select("logged_on, bodyweight_kg")
      .eq("user_id", userId)
      .order("logged_on", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load bodyweight: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    loggedOn: row.logged_on.slice(0, 10),
    bodyweightKg: kg(row.bodyweight_kg) ?? 0,
  }));
}

async function loadHidden(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<string[]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("user_hidden_exercises")
      .select("exercise_id")
      .eq("user_id", userId)
      .order("exercise_id", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load hidden exercises: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => slugById.get(row.exercise_id))
    .filter((slug): slug is string => Boolean(slug))
    .sort((a, b) => a.localeCompare(b));
}

async function loadDefaults(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<AccountTransfer["exerciseDefaults"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("user_exercise_defaults")
      .select(
        "exercise_id, default_base_weight_kg, default_target_sets, default_target_reps, default_target_weight_kg, suggest_warmups, suggest_target, max_suggested_warmup_sets",
      )
      .eq("user_id", userId)
      .order("exercise_id", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load exercise defaults: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const exercise = slugById.get(row.exercise_id);
    if (!exercise) {
      return [];
    }
    return [
      {
        exercise,
        baseWeightKg: kg(row.default_base_weight_kg),
        targetSets: row.default_target_sets,
        targetReps: row.default_target_reps,
        targetWeightKg: kg(row.default_target_weight_kg),
        suggestWarmups: row.suggest_warmups,
        suggestTarget: row.suggest_target,
        maxSuggestedWarmupSets: row.max_suggested_warmup_sets,
      },
    ];
  });
}

async function loadTemplates(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<AccountTransfer["templates"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("workout_templates")
      .select("id, name, notes")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load templates: ${error.message}`);
  }
  const templates = data ?? [];
  const exercises = await fetchInChunks(templates.map((template) => template.id), (ids, from, to) =>
    client
      .from("workout_template_exercises")
      .select("template_id, exercise_id, position, target_sets, target_reps, target_weight_kg, base_weight_kg, notes")
      .in("template_id", ids)
      .order("position", { ascending: true })
      .range(from, to),
  );
  if (exercises.error) {
    throw new Error(`Could not load templates: ${exercises.error.message}`);
  }
  return templates.flatMap((template) => {
    const rows = (exercises.data ?? [])
      .filter((row) => row.template_id === template.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((row) => {
        const exercise = slugById.get(row.exercise_id);
        return exercise ? [{ ...prescription(exercise, row), notes: row.notes }] : [];
      });
    if (rows.length === 0) {
      return [];
    }
    return [{ ref: template.id, name: template.name, notes: template.notes, exercises: rows }];
  });
}

async function loadPlans(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<AccountTransfer["plans"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("workout_plans")
      .select("id, name, notes, is_active")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load plans: ${error.message}`);
  }
  const plans = data ?? [];
  const days = await fetchInChunks(plans.map((plan) => plan.id), (ids, from, to) =>
    client
      .from("workout_plan_days")
      .select("id, plan_id, name, position")
      .in("plan_id", ids)
      .order("position", { ascending: true })
      .range(from, to),
  );
  if (days.error) {
    throw new Error(`Could not load plans: ${days.error.message}`);
  }
  const dayRows = days.data ?? [];
  const dayExercises = await fetchInChunks(dayRows.map((day) => day.id), (ids, from, to) =>
    client
      .from("workout_plan_day_exercises")
      .select("plan_day_id, exercise_id, position, target_sets, target_reps, target_weight_kg, base_weight_kg, notes")
      .in("plan_day_id", ids)
      .order("position", { ascending: true })
      .range(from, to),
  );
  if (dayExercises.error) {
    throw new Error(`Could not load plans: ${dayExercises.error.message}`);
  }
  return plans.flatMap((plan) => {
    const planDays = dayRows
      .filter((day) => day.plan_id === plan.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((day) => {
        const exercises = (dayExercises.data ?? [])
          .filter((row) => row.plan_day_id === day.id)
          .sort((a, b) => a.position - b.position)
          .flatMap((row) => {
            const exercise = slugById.get(row.exercise_id);
            return exercise ? [prescription(exercise, row)] : [];
          });
        return exercises.length === 0 ? [] : [{ ref: day.id, name: day.name, exercises }];
      });
    if (planDays.length === 0) {
      return [];
    }
    return [
      {
        ref: plan.id,
        name: plan.name,
        notes: plan.notes,
        active: plan.is_active,
        days: planDays,
      },
    ];
  });
}

async function loadSessions(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<AccountTransfer["sessions"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("workout_sessions")
      .select("id, performed_on, notes, source_template_id, plan_id, plan_day_id, started_at, completed_at")
      .eq("user_id", userId)
      .order("performed_on", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load sessions: ${error.message}`);
  }
  const sessions = data ?? [];
  const exercises = await fetchInChunks(sessions.map((session) => session.id), (ids, from, to) =>
    client
      .from("workout_session_exercises")
      .select(
        "id, session_id, exercise_id, position, base_weight_kg, target_sets, target_reps, target_weight_kg, notes, not_done",
      )
      .in("session_id", ids)
      .order("position", { ascending: true })
      .range(from, to),
  );
  if (exercises.error) {
    throw new Error(`Could not load sessions: ${exercises.error.message}`);
  }
  const exerciseRows = exercises.data ?? [];
  const sets = await fetchInChunks(exerciseRows.map((row) => row.id), (ids, from, to) =>
    client
      .from("workout_sets")
      .select("session_exercise_id, set_number, reps, weight_kg, is_warmup, performed_at, notes")
      .in("session_exercise_id", ids)
      .order("set_number", { ascending: true })
      .range(from, to),
  );
  if (sets.error) {
    throw new Error(`Could not load sessions: ${sets.error.message}`);
  }
  return sessions.flatMap((session) => {
    const sessionExercises = exerciseRows
      .filter((row) => row.session_id === session.id)
      .sort((a, b) => a.position - b.position)
      .flatMap((row) => {
        const exercise = slugById.get(row.exercise_id);
        if (!exercise) {
          return [];
        }
        return [
          {
            ...prescription(exercise, row),
            notDone: row.not_done,
            sets: (sets.data ?? [])
              .filter((set) => set.session_exercise_id === row.id)
              .sort((a, b) => a.set_number - b.set_number)
              .map((set) => ({
                setNumber: set.set_number,
                reps: set.reps,
                loadedKg: kg(set.weight_kg),
                warmup: set.is_warmup,
                performedAt: new Date(set.performed_at).toISOString(),
                notes: set.notes,
              })),
          },
        ];
      });
    if (sessionExercises.length === 0) {
      return [];
    }
    return [
      {
        ref: session.id,
        performedOn: session.performed_on.slice(0, 10),
        notes: session.notes,
        templateRef: session.source_template_id,
        planRef: session.plan_id,
        planDayRef: session.plan_day_id,
        startedAt: session.started_at ? new Date(session.started_at).toISOString() : null,
        completedAt: session.completed_at ? new Date(session.completed_at).toISOString() : null,
        exercises: sessionExercises,
      },
    ];
  });
}

async function loadGoals(
  client: Client,
  userId: string,
  slugById: Map<string, string>,
): Promise<AccountTransfer["goals"]> {
  const { data, error } = await fetchAllPages((from, to) =>
    client
      .from("strength_milestones")
      .select(
        "exercise_id, milestone_type, target_weight_kg, bodyweight_multiple, min_reps, due_on, note, achieved_at, achieved_bodyweight_kg, achieved_threshold_kg, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(from, to),
  );
  if (error) {
    throw new Error(`Could not load goals: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const exercise = slugById.get(row.exercise_id);
    if (!exercise) {
      return [];
    }
    return [
      {
        exercise,
        type: row.milestone_type,
        targetWeightKg: kg(row.target_weight_kg),
        bodyweightMultiple: kg(row.bodyweight_multiple),
        minReps: row.min_reps,
        dueOn: row.due_on ? row.due_on.slice(0, 10) : null,
        note: row.note,
        achievedAt: row.achieved_at ? new Date(row.achieved_at).toISOString() : null,
        achievedBodyweightKg: kg(row.achieved_bodyweight_kg),
        achievedThresholdKg: kg(row.achieved_threshold_kg),
      },
    ];
  });
}

function prescription(
  exercise: string,
  row: {
    target_sets: number | null;
    target_reps: number | null;
    target_weight_kg: number | null;
    base_weight_kg: number | null;
    notes: string | null;
  },
) {
  return {
    exercise,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetWeightKg: kg(row.target_weight_kg),
    baseWeightKg: kg(row.base_weight_kg),
    notes: row.notes,
  };
}

function kg(value: number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asTransferHttpError(error: unknown): never {
  if (error instanceof AccountTransferError) {
    throw new ApiHttpError(400, error.message);
  }
  throw error;
}
