/**
 * Creates the local demo user, workout history, and templates when they are missing.
 * Starter plans come from signup. This script does not add plans.
 * Runs from `npm run dev`. Refuses any Supabase URL that is not localhost.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);

/** Node 22+ has a global WebSocket. Node 20 needs the `ws` package, same as the app clients. */
function realtimeTransportOptions() {
  if (typeof globalThis.WebSocket !== "undefined") {
    return {};
  }
  return { realtime: { transport: require("ws") } };
}

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo1234";
const HISTORY_WEEKS = 24;
const BARBELL_BASE_KG = 20;

const LIFTS = {
  squat: { slug: "back-squat", startKg: 80, stepKg: 2.5 },
  frontSquat: { slug: "front-squat", startKg: 60, stepKg: 2.5 },
  bench: { slug: "barbell-bench-press", startKg: 60, stepKg: 2.5 },
  incline: { slug: "barbell-incline-press", startKg: 50, stepKg: 2.5 },
  deadlift: { slug: "deadlift", startKg: 120, stepKg: 5 },
  rdl: { slug: "barbell-romanian-deadlift", startKg: 80, stepKg: 5 },
  press: { slug: "overhead-press", startKg: 40, stepKg: 2.5 },
  row: { slug: "barbell-bent-over-row", startKg: 60, stepKg: 2.5 },
  pullUp: { slug: "pull-up", startKg: 0, stepKg: 2.5 },
};

/** Past sessions only. Signup already inserts the four starter plans. */
const HISTORY_DAYS = [
  { dayOffset: 0, note: "Squat and bench", lifts: ["squat", "bench"] },
  { dayOffset: 2, note: "Deadlift and row", lifts: ["deadlift", "row"] },
  { dayOffset: 4, note: "Press and bench", lifts: ["press", "bench"] },
];

/** Plans this script used to insert before starter plans existed. */
const OLD_DEMO_PLAN_NAMES = ["3-Day Strength", "Upper Lower"];

const DEMO_TEMPLATES = [
  {
    name: "Upper Power",
    notes: "Local demo template. Pressing and pulling.",
    lifts: [
      { key: "bench", sets: 4, reps: 5 },
      { key: "row", sets: 4, reps: 6 },
      { key: "press", sets: 3, reps: 6 },
    ],
  },
  {
    name: "Lower Strength",
    notes: "Local demo template. Squat and hinge.",
    lifts: [
      { key: "squat", sets: 4, reps: 5 },
      { key: "rdl", sets: 3, reps: 8 },
      { key: "frontSquat", sets: 3, reps: 5 },
    ],
  },
  {
    name: "Push Focus",
    notes: "Local demo template. Bench variations and press.",
    lifts: [
      { key: "bench", sets: 3, reps: 8 },
      { key: "incline", sets: 3, reps: 8 },
      { key: "press", sets: 3, reps: 8 },
    ],
  },
];

/** Extra sessions started from templates (notes used for idempotent top-up). */
const TEMPLATE_SESSION_SPECS = [
  { templateName: "Upper Power", weeksAgo: 1, dayOffset: 6, note: "Template: Upper Power" },
  { templateName: "Lower Strength", weeksAgo: 2, dayOffset: 6, note: "Template: Lower Strength" },
  { templateName: "Push Focus", weeksAgo: 3, dayOffset: 5, note: "Template: Push Focus" },
  { templateName: "Upper Power", weeksAgo: 5, dayOffset: 6, note: "Template: Upper Power (earlier)" },
  { templateName: "Lower Strength", weeksAgo: 6, dayOffset: 5, note: "Template: Lower Strength (earlier)" },
  { templateName: "Push Focus", weeksAgo: 7, dayOffset: 6, note: "Template: Push Focus (earlier)" },
];

/**
 * Future-dated session with targets but no logged sets (Home “Upcoming”).
 * Monday in March 2028 matches the squat and bench history day. It is not tied to a plan.
 */
const PLANNED_SESSION_SPECS = [
  {
    performedOn: "2028-03-06",
    planDayNote: "Squat and bench",
    note: "Planned: Squat Bench",
  },
];

/** Finished-session timestamps for a performed calendar day (local noon / evening). */
function finishedTimestamps(performed) {
  const started = new Date(
    performed.getFullYear(),
    performed.getMonth(),
    performed.getDate(),
    12,
    0,
  );
  const completed = new Date(
    performed.getFullYear(),
    performed.getMonth(),
    performed.getDate(),
    13,
    0,
  );
  return { started_at: started.toISOString(), completed_at: completed.toISOString() };
}

function loadEnvFile(filePath) {
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function isLocalSupabaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

function startOfWeekMonday(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const offsetToMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offsetToMonday);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function toYyyyMmDd(value) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundToStep(value, step) {
  return Number((Math.round(value / step) * step).toFixed(2));
}

function weekKind(weekIndex) {
  if (weekIndex === 4 || weekIndex === 16) {
    return "miss";
  }
  if (weekIndex === 8 || weekIndex === 20) {
    return "deload";
  }
  if (weekIndex === 12 || weekIndex === 22) {
    return "heavy";
  }
  return "normal";
}

function workingWeightKg(lift, weekIndex, kind) {
  const progressed = lift.startKg + lift.stepKg * weekIndex;
  if (kind === "deload") {
    return roundToStep(Math.max(lift.stepKg, progressed * 0.85), lift.stepKg);
  }
  return roundToStep(Math.max(0, progressed), lift.stepKg);
}

function setsFor(kind, topWeight, step) {
  const warmupRatios = kind === "deload" ? [0.6] : [0.5, 0.75];
  const warmups =
    topWeight <= 0
      ? []
      : warmupRatios.map((ratio) => ({
          reps: ratio < 0.7 ? 5 : 3,
          weight_kg: Math.max(step, roundToStep(topWeight * ratio, step)),
          is_warmup: true,
        }));
  const workingCount = kind === "deload" ? 2 : kind === "heavy" ? 5 : 4;
  const working = Array.from({ length: workingCount }, () => ({
    reps: 5,
    weight_kg: topWeight,
    is_warmup: false,
  }));
  return [...warmups, ...working];
}

function buildPlanHistory(exerciseIdBySlug, planId, planDayIdByNote, planDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeek = startOfWeekMonday(today);
  const firstWeek = addDays(thisWeek, -(HISTORY_WEEKS - 1) * 7);
  const sessions = [];
  const sessionExercises = [];
  const sets = [];

  for (let weekIndex = 0; weekIndex < HISTORY_WEEKS; weekIndex += 1) {
    const kind = weekKind(weekIndex);
    if (kind === "miss") {
      continue;
    }
    const weekStart = addDays(firstWeek, weekIndex * 7);
    for (const day of planDays) {
      const performed = addDays(weekStart, day.dayOffset);
      if (performed > today) {
        continue;
      }
      const sessionId = randomUUID();
      const note = kind === "deload" ? `Deload. ${day.note}` : day.note;
      sessions.push({
        id: sessionId,
        performed_on: toYyyyMmDd(performed),
        notes: note,
        plan_id: planId,
        plan_day_id: planDayIdByNote.get(day.note) ?? null,
        source_template_id: null,
        ...finishedTimestamps(performed),
      });
      day.lifts.forEach((liftKey, index) => {
        const lift = LIFTS[liftKey];
        const exerciseId = exerciseIdBySlug.get(lift.slug);
        const topWeight = workingWeightKg(lift, weekIndex, kind);
        const plannedSets = setsFor(kind, topWeight, lift.stepKg);
        const workingCount = plannedSets.filter((set) => !set.is_warmup).length;
        const sessionExerciseId = randomUUID();
        sessionExercises.push({
          id: sessionExerciseId,
          session_id: sessionId,
          exercise_id: exerciseId,
          position: index + 1,
          target_sets: workingCount,
          target_reps: 5,
          target_weight_kg: topWeight,
          base_weight_kg: BARBELL_BASE_KG,
          notes: null,
        });
        plannedSets.forEach((set, setIndex) => {
          sets.push({
            session_exercise_id: sessionExerciseId,
            set_number: setIndex + 1,
            reps: set.reps,
            weight_kg: set.weight_kg,
            is_warmup: set.is_warmup,
            performed_at: new Date(
              performed.getFullYear(),
              performed.getMonth(),
              performed.getDate(),
              12,
              setIndex,
            ).toISOString(),
          });
        });
      });
    }
  }

  return { sessions, sessionExercises, sets };
}

function buildTemplateSession(
  exerciseIdBySlug,
  templateId,
  templateDef,
  performed,
  note,
  weekIndex,
) {
  const sessionId = randomUUID();
  const sessions = [
    {
      id: sessionId,
      performed_on: toYyyyMmDd(performed),
      notes: note,
      plan_id: null,
      plan_day_id: null,
      source_template_id: templateId,
      ...finishedTimestamps(performed),
    },
  ];
  const sessionExercises = [];
  const sets = [];

  templateDef.lifts.forEach((entry, index) => {
    const lift = LIFTS[entry.key];
    const exerciseId = exerciseIdBySlug.get(lift.slug);
    const topWeight = workingWeightKg(lift, weekIndex, "normal");
    const warmups = setsFor("normal", topWeight, lift.stepKg).filter((set) => set.is_warmup);
    const working = Array.from({ length: entry.sets }, () => ({
      reps: entry.reps,
      weight_kg: topWeight,
      is_warmup: false,
    }));
    const plannedSets = [...warmups, ...working];
    const sessionExerciseId = randomUUID();
    sessionExercises.push({
      id: sessionExerciseId,
      session_id: sessionId,
      exercise_id: exerciseId,
      position: index + 1,
      target_sets: entry.sets,
      target_reps: entry.reps,
      target_weight_kg: topWeight,
      base_weight_kg: BARBELL_BASE_KG,
      notes: null,
    });
    plannedSets.forEach((set, setIndex) => {
      sets.push({
        session_exercise_id: sessionExerciseId,
        set_number: setIndex + 1,
        reps: set.reps,
        weight_kg: set.weight_kg,
        is_warmup: set.is_warmup,
        performed_at: new Date(
          performed.getFullYear(),
          performed.getMonth(),
          performed.getDate(),
          17,
          setIndex,
        ).toISOString(),
      });
    });
  });

  return { sessions, sessionExercises, sets };
}

async function removeOldDemoPlans(supabase, userId) {
  const { data, error } = await supabase
    .from("workout_plans")
    .delete()
    .eq("user_id", userId)
    .in("name", OLD_DEMO_PLAN_NAMES)
    .select("id");
  if (error) {
    throw new Error(`Could not remove old demo plans: ${error.message}`);
  }
  return data?.length ?? 0;
}

async function ensureTemplate(supabase, userId, exerciseIdBySlug, templateDef) {
  const { data: existing, error: existingError } = await supabase
    .from("workout_templates")
    .select("id")
    .eq("user_id", userId)
    .eq("name", templateDef.name)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Could not read demo template "${templateDef.name}": ${existingError.message}`);
  }
  if (existing?.id) {
    return { templateId: existing.id, created: false, name: templateDef.name };
  }

  const templateId = randomUUID();
  const { error: templateError } = await supabase.from("workout_templates").insert({
    id: templateId,
    user_id: userId,
    name: templateDef.name,
    notes: templateDef.notes,
  });
  if (templateError) {
    throw new Error(`Could not create demo template "${templateDef.name}": ${templateError.message}`);
  }

  const exercises = templateDef.lifts.map((entry, index) => {
    const lift = LIFTS[entry.key];
    return {
      template_id: templateId,
      exercise_id: exerciseIdBySlug.get(lift.slug),
      position: index + 1,
      target_sets: entry.sets,
      target_reps: entry.reps,
      target_weight_kg: lift.startKg,
      base_weight_kg: BARBELL_BASE_KG,
    };
  });
  const { error: exercisesError } = await supabase.from("workout_template_exercises").insert(exercises);
  if (exercisesError) {
    throw new Error(
      `Could not create exercises for template "${templateDef.name}": ${exercisesError.message}`,
    );
  }

  return { templateId, created: true, name: templateDef.name };
}

async function insertChunks(supabase, table, rows) {
  const size = 200;
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw new Error(`Could not insert ${table}: ${error.message}`);
    }
  }
}

async function findUserId(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Could not list users: ${error.message}`);
    }
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return match.id;
    }
    if (data.users.length < 200) {
      return null;
    }
  }
  return null;
}

async function ensureDemoUser(supabase) {
  const existingId = await findUserId(supabase, DEMO_EMAIL);
  if (existingId) {
    return { userId: existingId, created: false };
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the demo user.");
  }
  return { userId: data.user.id, created: true };
}

async function ensureExerciseDefaults(supabase, userId, exerciseIdBySlug) {
  const slugs = Object.values(LIFTS).map((lift) => lift.slug);
  const defaults = slugs.map((slug) => ({
    user_id: userId,
    exercise_id: exerciseIdBySlug.get(slug),
    default_base_weight_kg: BARBELL_BASE_KG,
    default_target_sets: 4,
    default_target_reps: 5,
  }));
  const { error: defaultsError } = await supabase
    .from("user_exercise_defaults")
    .upsert(defaults, { onConflict: "user_id,exercise_id", ignoreDuplicates: true });
  if (defaultsError) {
    throw new Error(`Could not save exercise defaults: ${defaultsError.message}`);
  }
}

async function seedPlanSessions(supabase, userId, exerciseIdBySlug) {
  const history = buildPlanHistory(exerciseIdBySlug, null, new Map(), HISTORY_DAYS);
  const sessions = history.sessions.map((session) => ({ ...session, user_id: userId }));
  await insertChunks(supabase, "workout_sessions", sessions);
  await insertChunks(supabase, "workout_session_exercises", history.sessionExercises);
  await insertChunks(supabase, "workout_sets", history.sets);
  return sessions.length;
}

function buildPlannedSession(exerciseIdBySlug, planDay, performedOn, note) {
  const sessionId = randomUUID();
  const sessions = [
    {
      id: sessionId,
      performed_on: performedOn,
      notes: note,
      plan_id: null,
      plan_day_id: null,
      source_template_id: null,
    },
  ];
  const sessionExercises = planDay.lifts.map((liftKey, index) => {
    const lift = LIFTS[liftKey];
    return {
      id: randomUUID(),
      session_id: sessionId,
      exercise_id: exerciseIdBySlug.get(lift.slug),
      position: index + 1,
      target_sets: 4,
      target_reps: 5,
      target_weight_kg: lift.startKg,
      base_weight_kg: BARBELL_BASE_KG,
      notes: null,
    };
  });
  return { sessions, sessionExercises };
}

async function seedMissingPlannedSessions(supabase, userId, exerciseIdBySlug) {
  const notes = PLANNED_SESSION_SPECS.map((spec) => spec.note);
  const { data: existing, error } = await supabase
    .from("workout_sessions")
    .select("notes")
    .eq("user_id", userId)
    .in("notes", notes);
  if (error) {
    throw new Error(`Could not read planned sessions: ${error.message}`);
  }
  const have = new Set((existing ?? []).map((row) => row.notes));

  let added = 0;
  for (const spec of PLANNED_SESSION_SPECS) {
    if (have.has(spec.note) || added >= 1) {
      continue;
    }
    const planDay = HISTORY_DAYS.find((day) => day.note === spec.planDayNote);
    if (!planDay) {
      continue;
    }
    const built = buildPlannedSession(exerciseIdBySlug, planDay, spec.performedOn, spec.note);
    await insertChunks(
      supabase,
      "workout_sessions",
      built.sessions.map((session) => ({ ...session, user_id: userId })),
    );
    await insertChunks(supabase, "workout_session_exercises", built.sessionExercises);
    added += 1;
  }
  return added;
}

async function seedMissingTemplateSessions(supabase, userId, exerciseIdBySlug, templatesByName) {
  const notes = TEMPLATE_SESSION_SPECS.map((spec) => spec.note);
  const { data: existing, error } = await supabase
    .from("workout_sessions")
    .select("notes")
    .eq("user_id", userId)
    .in("notes", notes);
  if (error) {
    throw new Error(`Could not read template sessions: ${error.message}`);
  }
  const have = new Set((existing ?? []).map((row) => row.notes));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeek = startOfWeekMonday(today);

  let added = 0;
  for (const spec of TEMPLATE_SESSION_SPECS) {
    if (have.has(spec.note)) {
      continue;
    }
    const template = templatesByName.get(spec.templateName);
    const templateDef = DEMO_TEMPLATES.find((row) => row.name === spec.templateName);
    if (!template || !templateDef) {
      continue;
    }
    const weekStart = addDays(thisWeek, -spec.weeksAgo * 7);
    const performed = addDays(weekStart, spec.dayOffset);
    if (performed > today) {
      continue;
    }
    const weekIndex = Math.max(0, HISTORY_WEEKS - 1 - spec.weeksAgo);
    const built = buildTemplateSession(
      exerciseIdBySlug,
      template.templateId,
      templateDef,
      performed,
      spec.note,
      weekIndex,
    );
    await insertChunks(
      supabase,
      "workout_sessions",
      built.sessions.map((session) => ({ ...session, user_id: userId })),
    );
    await insertChunks(supabase, "workout_session_exercises", built.sessionExercises);
    await insertChunks(supabase, "workout_sets", built.sets);
    added += 1;
  }
  return added;
}

async function seed() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.warn("Local demo seed skipped: Supabase env vars are missing.");
    return;
  }
  if (!isLocalSupabaseUrl(supabaseUrl)) {
    console.log("Local demo seed skipped: Supabase URL is not localhost.");
    return;
  }

  try {
    const health = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: anonKey },
    });
    if (!health.ok) {
      console.warn(`Local demo seed skipped: Supabase auth is not ready (${health.status}).`);
      return;
    }
  } catch {
    console.warn(
      "Local demo seed skipped: local Supabase is not running. From the repo root, run supabase start.",
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...realtimeTransportOptions(),
  });

  const { userId, created } = await ensureDemoUser(supabase);

  if (!created) {
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      ...realtimeTransportOptions(),
    });
    const signIn = await anon.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (signIn.error) {
      console.warn(
        `Local demo seed skipped: ${DEMO_EMAIL} exists, but the demo password does not match. Not changing it.`,
      );
      return;
    }
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("app_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (appUserError) {
    throw new Error(`Could not read app user: ${appUserError.message}`);
  }
  if (!appUser) {
    const { error } = await supabase.from("app_users").insert({ id: userId });
    if (error) {
      throw new Error(`Could not create app user: ${error.message}`);
    }
  }

  const slugs = Object.values(LIFTS).map((lift) => lift.slug);
  const { data: exercises, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, slug")
    .in("slug", slugs);
  if (exerciseError) {
    throw new Error(`Could not read exercises: ${exerciseError.message}`);
  }
  const exerciseIdBySlug = new Map((exercises ?? []).map((row) => [row.slug, row.id]));
  const missing = slugs.filter((slug) => !exerciseIdBySlug.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `Exercise catalog is missing ${missing.join(", ")}. From the repo root, run supabase db reset.`,
    );
  }

  const removedPlans = await removeOldDemoPlans(supabase, userId);

  const templates = [];
  for (const templateDef of DEMO_TEMPLATES) {
    templates.push(await ensureTemplate(supabase, userId, exerciseIdBySlug, templateDef));
  }
  const templatesByName = new Map(templates.map((row) => [row.name, row]));

  await ensureExerciseDefaults(supabase, userId, exerciseIdBySlug);

  const { count, error: countError } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) {
    throw new Error(`Could not read demo sessions: ${countError.message}`);
  }

  let sessionCount = count ?? 0;
  let seededPlanSessions = 0;
  if (sessionCount === 0) {
    seededPlanSessions = await seedPlanSessions(supabase, userId, exerciseIdBySlug);
    sessionCount = seededPlanSessions;
  }

  const seededTemplateSessions = await seedMissingTemplateSessions(
    supabase,
    userId,
    exerciseIdBySlug,
    templatesByName,
  );
  sessionCount += seededTemplateSessions;

  const seededPlannedSessions = await seedMissingPlannedSessions(supabase, userId, exerciseIdBySlug);
  sessionCount += seededPlannedSessions;

  const createdLabel = created ? "Created" : "Using";
  const templateNames = templates.map((template) => template.name).join(", ");
  const templateCreated = templates.filter((template) => template.created).length;
  const addedBits = [
    seededPlanSessions ? `+${seededPlanSessions} history` : null,
    seededTemplateSessions ? `+${seededTemplateSessions} template` : null,
    seededPlannedSessions ? `+${seededPlannedSessions} planned` : null,
    removedPlans ? `-${removedPlans} old plans` : null,
  ].filter(Boolean);
  console.log(
    [
      `${createdLabel} local demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}.`,
      `${sessionCount} sessions` + (addedBits.length > 0 ? ` (${addedBits.join(", ")})` : ""),
      `${templates.length} templates (${templateCreated} new): ${templateNames}.`,
    ].join(" "),
  );
}
try {
  await seed();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(message)) {
    console.warn(`Local demo seed skipped: ${message}`);
    process.exit(0);
  }
  console.error(`Local demo seed failed: ${message}`);
  process.exit(1);
}
