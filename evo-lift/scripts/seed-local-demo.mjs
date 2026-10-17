/**
 * Creates the local demo user, workout history, and active plan when they are missing.
 * Runs from `npm run dev`. Refuses any Supabase URL that is not localhost.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo1234";
const HISTORY_WEEKS = 16;
const BARBELL_BASE_KG = 20;
const PLAN_NAME = "3-Day Strength";

const LIFTS = {
  squat: { slug: "back-squat", startKg: 80, stepKg: 2.5 },
  bench: { slug: "barbell-bench-press", startKg: 60, stepKg: 2.5 },
  deadlift: { slug: "deadlift", startKg: 120, stepKg: 5 },
  press: { slug: "overhead-press", startKg: 40, stepKg: 2.5 },
  row: { slug: "barbell-bent-over-row", startKg: 60, stepKg: 2.5 },
};

/** Monday, Wednesday, Friday. Offsets are days from the Monday of that week. */
const PLAN_DAYS = [
  { name: "Squat Bench", dayOffset: 0, note: "Squat and bench", lifts: ["squat", "bench"] },
  { name: "Deadlift Row", dayOffset: 2, note: "Deadlift and row", lifts: ["deadlift", "row"] },
  { name: "Press Bench", dayOffset: 4, note: "Press and bench", lifts: ["press", "bench"] },
];

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
  if (weekIndex === 4) {
    return "miss";
  }
  if (weekIndex === 8) {
    return "deload";
  }
  if (weekIndex === 12) {
    return "heavy";
  }
  return "normal";
}

function workingWeightKg(lift, weekIndex, kind) {
  const progressed = lift.startKg + lift.stepKg * weekIndex;
  if (kind === "deload") {
    return roundToStep(progressed * 0.85, lift.stepKg);
  }
  return roundToStep(progressed, lift.stepKg);
}

function setsFor(kind, topWeight, step) {
  const warmupRatios = kind === "deload" ? [0.6] : [0.5, 0.75];
  const warmups = warmupRatios.map((ratio) => ({
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

function buildHistory(exerciseIdBySlug, planId, planDayIdByNote) {
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
    for (const day of PLAN_DAYS) {
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
        plan_day_id: planDayIdByNote.get(day.note),
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

async function ensureActivePlan(supabase, userId, exerciseIdBySlug) {
  const { data: existing, error: existingError } = await supabase
    .from("workout_plans")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("name", PLAN_NAME)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Could not read demo plan: ${existingError.message}`);
  }

  let planId = existing?.id ?? null;
  if (!planId) {
    planId = randomUUID();
    const { error: planError } = await supabase.from("workout_plans").insert({
      id: planId,
      user_id: userId,
      name: PLAN_NAME,
      notes: "Local demo plan. Three full-body days.",
      is_active: true,
    });
    if (planError) {
      throw new Error(`Could not create demo plan: ${planError.message}`);
    }

    const days = PLAN_DAYS.map((day, index) => ({
      id: randomUUID(),
      plan_id: planId,
      name: day.name,
      position: index + 1,
      note: day.note,
      lifts: day.lifts,
    }));
    const { error: daysError } = await supabase.from("workout_plan_days").insert(
      days.map(({ id, plan_id, name, position }) => ({ id, plan_id, name, position })),
    );
    if (daysError) {
      throw new Error(`Could not create demo plan days: ${daysError.message}`);
    }

    const dayExercises = [];
    for (const day of days) {
      day.lifts.forEach((liftKey, index) => {
        const lift = LIFTS[liftKey];
        dayExercises.push({
          plan_day_id: day.id,
          exercise_id: exerciseIdBySlug.get(lift.slug),
          position: index + 1,
          target_sets: 4,
          target_reps: 5,
          target_weight_kg: lift.startKg,
          base_weight_kg: BARBELL_BASE_KG,
        });
      });
    }
    const { error: dayExercisesError } = await supabase
      .from("workout_plan_day_exercises")
      .insert(dayExercises);
    if (dayExercisesError) {
      throw new Error(`Could not create demo plan exercises: ${dayExercisesError.message}`);
    }
  } else if (!existing.is_active) {
    const { error: activateError } = await supabase
      .from("workout_plans")
      .update({ is_active: true })
      .eq("id", planId);
    if (activateError) {
      throw new Error(`Could not activate demo plan: ${activateError.message}`);
    }
  }

  const { data: days, error: daysReadError } = await supabase
    .from("workout_plan_days")
    .select("id, name, position")
    .eq("plan_id", planId)
    .order("position", { ascending: true });
  if (daysReadError) {
    throw new Error(`Could not read demo plan days: ${daysReadError.message}`);
  }

  const planDayIdByNote = new Map();
  for (const day of PLAN_DAYS) {
    const match = (days ?? []).find((row) => row.name === day.name);
    if (match) {
      planDayIdByNote.set(day.note, match.id);
    }
  }

  for (const day of PLAN_DAYS) {
    const planDayId = planDayIdByNote.get(day.note);
    if (!planDayId) {
      continue;
    }
    const notes = [day.note, `Deload. ${day.note}`];
    const { error: linkError } = await supabase
      .from("workout_sessions")
      .update({ plan_id: planId, plan_day_id: planDayId })
      .eq("user_id", userId)
      .in("notes", notes)
      .is("plan_id", null);
    if (linkError) {
      throw new Error(`Could not link demo sessions to plan: ${linkError.message}`);
    }
  }

  return { planId, planDayIdByNote, created: !existing };
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
  });

  const { userId, created } = await ensureDemoUser(supabase);

  if (!created) {
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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

  const plan = await ensureActivePlan(supabase, userId, exerciseIdBySlug);

  const { count, error: countError } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) {
    throw new Error(`Could not read demo sessions: ${countError.message}`);
  }

  let sessionCount = count ?? 0;
  if (sessionCount === 0) {
    const history = buildHistory(exerciseIdBySlug, plan.planId, plan.planDayIdByNote);
    const sessions = history.sessions.map((session) => ({ ...session, user_id: userId }));
    await insertChunks(supabase, "workout_sessions", sessions);
    await insertChunks(supabase, "workout_session_exercises", history.sessionExercises);
    await insertChunks(supabase, "workout_sets", history.sets);
    sessionCount = sessions.length;

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

  const createdLabel = created ? "Created" : "Using";
  const planLabel = plan.created
    ? `Seeded active plan "${PLAN_NAME}".`
    : `Active plan "${PLAN_NAME}" ready.`;
  if ((count ?? 0) > 0) {
    console.log(`${createdLabel} local demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}. ${planLabel}`);
    return;
  }
  console.log(
    `${createdLabel} local demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}. Seeded ${sessionCount} sessions. ${planLabel}`,
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
