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
/**
 * Assisted Dip history for the local demo. Logged kg is assistance, so later
 * sessions use less help. 0 kg is unassisted. Warmups are heavier and must not
 * become the mark. Notes keep the top-up idempotent.
 */
const ASSISTED_DIP_SLUG = "assisted-dip";

/**
 * Dumbbell sessions with a logged load and no base weight. Loaded and Total
 * are the same number. Notes keep the top-up idempotent.
 */
const NO_BASE_SESSIONS = [
  {
    slug: "dumbbell-supinated-curl",
    note: "Dumbbell curl: 10 kg",
    daysAgo: 20,
    targetKg: 10,
    targetReps: 10,
    sets: [
      { reps: 8, weightKg: 6, isWarmup: true },
      { reps: 10, weightKg: 10, isWarmup: false },
      { reps: 10, weightKg: 10, isWarmup: false },
      { reps: 8, weightKg: 10, isWarmup: false },
    ],
  },
  {
    slug: "dumbbell-supinated-curl",
    note: "Dumbbell curl: 12 kg",
    daysAgo: 12,
    targetKg: 12,
    targetReps: 10,
    sets: [
      { reps: 8, weightKg: 8, isWarmup: true },
      { reps: 10, weightKg: 12, isWarmup: false },
      { reps: 10, weightKg: 12, isWarmup: false },
      { reps: 9, weightKg: 12, isWarmup: false },
    ],
  },
  {
    slug: "dumbbell-supinated-curl",
    note: "Dumbbell curl: 14 kg",
    daysAgo: 4,
    targetKg: 14,
    targetReps: 8,
    sets: [
      { reps: 6, weightKg: 10, isWarmup: true },
      { reps: 8, weightKg: 14, isWarmup: false },
      { reps: 8, weightKg: 14, isWarmup: false },
      { reps: 6, weightKg: 14, isWarmup: false },
    ],
  },
  {
    slug: "dumbbell-bench-press",
    note: "Dumbbell bench: 22 kg",
    daysAgo: 16,
    targetKg: 22,
    targetReps: 8,
    sets: [
      { reps: 8, weightKg: 14, isWarmup: true },
      { reps: 8, weightKg: 22, isWarmup: false },
      { reps: 8, weightKg: 22, isWarmup: false },
      { reps: 6, weightKg: 22, isWarmup: false },
    ],
  },
  {
    slug: "dumbbell-bench-press",
    note: "Dumbbell bench: 24 kg",
    daysAgo: 6,
    targetKg: 24,
    targetReps: 8,
    sets: [
      { reps: 6, weightKg: 16, isWarmup: true },
      { reps: 8, weightKg: 24, isWarmup: false },
      { reps: 8, weightKg: 24, isWarmup: false },
      { reps: 7, weightKg: 24, isWarmup: false },
    ],
  },
];
const ASSISTED_DIP_SESSIONS = [
  {
    note: "Assisted Dip: 20 kg",
    daysAgo: 35,
    targetKg: 20,
    sets: [
      { reps: 5, weightKg: 30, isWarmup: true },
      { reps: 8, weightKg: 25, isWarmup: false },
      { reps: 8, weightKg: 25, isWarmup: false },
      { reps: 6, weightKg: 20, isWarmup: false },
    ],
  },
  {
    note: "Assisted Dip: 15 kg",
    daysAgo: 21,
    targetKg: 15,
    sets: [
      { reps: 5, weightKg: 25, isWarmup: true },
      { reps: 8, weightKg: 20, isWarmup: false },
      { reps: 8, weightKg: 15, isWarmup: false },
      { reps: 6, weightKg: 15, isWarmup: false },
    ],
  },
  {
    note: "Assisted Dip: 10 kg",
    daysAgo: 10,
    targetKg: 10,
    sets: [
      { reps: 3, weightKg: 20, isWarmup: true },
      { reps: 8, weightKg: 15, isWarmup: false },
      { reps: 8, weightKg: 10, isWarmup: false },
      { reps: 10, weightKg: 10, isWarmup: false },
    ],
  },
  {
    note: "Assisted Dip: unassisted",
    daysAgo: 3,
    targetKg: 0,
    sets: [
      { reps: 3, weightKg: 15, isWarmup: true },
      { reps: 8, weightKg: 5, isWarmup: false },
      { reps: 8, weightKg: 0, isWarmup: false },
      { reps: 10, weightKg: 0, isWarmup: false },
    ],
  },
];

/**
 * Recent sessions for report testing. Notes keep the top-up idempotent.
 * Spread across the last 4 weeks: progression, a missed target, a skip, and a note.
 */
const REPORT_SAMPLE_SESSIONS = [
  {
    note: "Report sample: squat bench, week 1",
    daysAgo: 26,
    sessionNote: null,
    exercises: [
      { slug: "back-squat", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 100, sets: [[5, 60, true], [5, 100], [5, 100], [5, 100]] },
      { slug: "barbell-bench-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 60, sets: [[8, 40, true], [8, 60], [8, 60], [7, 60]] },
      { slug: "lat-pulldown", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 50, sets: [[10, 50], [10, 50], [10, 50]] },
    ],
  },
  {
    note: "Report sample: deadlift row, week 1",
    daysAgo: 24,
    sessionNote: null,
    exercises: [
      { slug: "deadlift", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 140, sets: [[3, 80, true], [5, 140], [5, 140], [5, 140]] },
      { slug: "barbell-bent-over-row", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 70, sets: [[8, 70], [8, 70], [6, 70]] },
      { slug: "seated-face-pull", baseKg: null, targetSets: 3, targetReps: 12, targetKg: 15, sets: [[12, 15], [12, 15], [12, 15]] },
    ],
  },
  {
    note: "Report sample: press curl, week 1",
    daysAgo: 22,
    sessionNote: "Left wrist sore after bench yesterday.",
    exercises: [
      { slug: "overhead-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 40, sets: [[8, 40], [8, 40], [8, 40]] },
      { slug: "dumbbell-supinated-curl", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 12, sets: [[10, 12], [10, 12], [8, 12]] },
      { slug: "lat-pulldown", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 52.5, skipped: true, exerciseNote: "Skipped. Shoulder felt tight." },
    ],
  },
  {
    note: "Report sample: squat bench, week 2",
    daysAgo: 19,
    sessionNote: null,
    exercises: [
      { slug: "back-squat", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 105, sets: [[5, 60, true], [5, 105], [5, 105], [5, 105]] },
      { slug: "barbell-bench-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 62.5, sets: [[8, 40, true], [8, 62.5], [8, 62.5], [8, 62.5]] },
      { slug: "leg-extension", baseKg: null, targetSets: 3, targetReps: 12, targetKg: 45, sets: [[12, 45], [12, 45], [12, 45]] },
    ],
  },
  {
    note: "Report sample: deadlift row, week 2",
    daysAgo: 17,
    sessionNote: null,
    exercises: [
      { slug: "deadlift", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 145, sets: [[3, 80, true], [5, 145], [5, 145], [4, 145]] },
      { slug: "barbell-bent-over-row", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 70, sets: [[8, 70], [8, 70], [8, 70]] },
      { slug: "dumbbell-row", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 24, sets: [[10, 24], [10, 24], [9, 24]] },
    ],
  },
  {
    note: "Report sample: press curl, week 2",
    daysAgo: 15,
    sessionNote: "Wrist was fine today.",
    exercises: [
      { slug: "overhead-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 42.5, sets: [[8, 42.5], [8, 42.5], [7, 42.5]] },
      { slug: "dumbbell-supinated-curl", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 14, sets: [[10, 14], [10, 14], [10, 14]] },
      { slug: "seated-face-pull", baseKg: null, targetSets: 3, targetReps: 12, targetKg: 17.5, sets: [[12, 17.5], [12, 17.5], [12, 17.5]] },
    ],
  },
  {
    note: "Report sample: squat bench, week 3",
    daysAgo: 12,
    sessionNote: null,
    exercises: [
      { slug: "back-squat", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 107.5, sets: [[5, 60, true], [5, 107.5], [5, 107.5], [5, 107.5]] },
      { slug: "barbell-bench-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 62.5, sets: [[8, 40, true], [8, 62.5], [8, 62.5], [6, 62.5]] },
      { slug: "lat-pulldown", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 55, sets: [[10, 55], [10, 55], [8, 55]] },
    ],
  },
  {
    note: "Report sample: deadlift row, week 3",
    daysAgo: 10,
    sessionNote: null,
    exercises: [
      { slug: "deadlift", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 145, sets: [[3, 80, true], [5, 145], [5, 145], [5, 145]] },
      { slug: "barbell-bent-over-row", baseKg: 20, targetSets: 3, targetReps: 10, targetKg: 70, sets: [[10, 70], [10, 70], [8, 70]] },
      { slug: "leg-extension", baseKg: null, targetSets: 3, targetReps: 12, targetKg: 50, sets: [[12, 50], [12, 50], [12, 50]] },
    ],
  },
  {
    note: "Report sample: press curl, week 3",
    daysAgo: 8,
    sessionNote: null,
    exercises: [
      { slug: "overhead-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 42.5, sets: [[8, 42.5], [8, 42.5], [8, 42.5]] },
      { slug: "dumbbell-supinated-curl", baseKg: null, targetSets: 3, targetReps: 8, targetKg: 16, sets: [[8, 16], [8, 16], [7, 16]] },
      { slug: "assisted-dip", baseKg: null, targetSets: 3, targetReps: 8, targetKg: 10, sets: [[8, 15, true], [8, 10], [8, 10], [8, 10]] },
    ],
  },
  {
    note: "Report sample: squat bench, week 4",
    daysAgo: 5,
    sessionNote: null,
    exercises: [
      { slug: "back-squat", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 110, sets: [[5, 60, true], [5, 110], [5, 110], [5, 110]] },
      { slug: "barbell-bench-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 65, sets: [[8, 40, true], [8, 65], [8, 65], [8, 65]] },
      { slug: "lat-pulldown", baseKg: null, targetSets: 3, targetReps: 10, targetKg: 55, sets: [[10, 55], [10, 55], [10, 55]] },
    ],
  },
  {
    note: "Report sample: deadlift row, week 4",
    daysAgo: 3,
    sessionNote: null,
    exercises: [
      { slug: "deadlift", baseKg: 20, targetSets: 3, targetReps: 5, targetKg: 150, sets: [[3, 80, true], [5, 150], [5, 150], [5, 150]] },
      { slug: "barbell-bent-over-row", baseKg: 20, targetSets: 3, targetReps: 10, targetKg: 72.5, sets: [[10, 72.5], [10, 72.5], [10, 72.5]] },
      { slug: "seated-face-pull", baseKg: null, targetSets: 3, targetReps: 12, targetKg: 17.5, sets: [[12, 17.5], [12, 17.5], [11, 17.5]] },
    ],
  },
  {
    note: "Report sample: press curl, week 4",
    daysAgo: 1,
    sessionNote: "Wrist stayed quiet. Stopped the last curl one rep short.",
    exercises: [
      { slug: "overhead-press", baseKg: 20, targetSets: 3, targetReps: 8, targetKg: 42.5, sets: [[8, 42.5], [8, 42.5], [8, 42.5]] },
      { slug: "dumbbell-supinated-curl", baseKg: null, targetSets: 3, targetReps: 8, targetKg: 16, sets: [[8, 16], [8, 16], [7, 16]] },
      { slug: "assisted-dip", baseKg: null, targetSets: 3, targetReps: 8, targetKg: 5, sets: [[8, 10, true], [8, 5], [8, 5], [8, 5]] },
    ],
  },
];

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

/** A later Full body squat so the plan progress line has two points. The note keeps it idempotent. */
const PLAN_SQUAT_FOLLOW_UP = {
  planName: "Full body",
  dayName: "Full Body #1",
  note: "Full body: squat, second session",
  daysAgo: 8,
  reps: 6,
  loadedKg: 142.5,
  sets: 3,
};

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

function buildAssistedDipSession(exerciseId, spec, performed) {
  const sessionId = randomUUID();
  const sessionExerciseId = randomUUID();
  const workingCount = spec.sets.filter((set) => !set.isWarmup).length;
  return {
    sessions: [
      {
        id: sessionId,
        performed_on: toYyyyMmDd(performed),
        notes: spec.note,
        plan_id: null,
        plan_day_id: null,
        source_template_id: null,
        ...finishedTimestamps(performed),
      },
    ],
    sessionExercises: [
      {
        id: sessionExerciseId,
        session_id: sessionId,
        exercise_id: exerciseId,
        position: 1,
        target_sets: workingCount,
        target_reps: 8,
        target_weight_kg: spec.targetKg,
        base_weight_kg: null,
        notes: null,
      },
    ],
    sets: spec.sets.map((set, setIndex) => ({
      session_exercise_id: sessionExerciseId,
      set_number: setIndex + 1,
      reps: set.reps,
      weight_kg: set.weightKg,
      is_warmup: set.isWarmup,
      performed_at: new Date(
        performed.getFullYear(),
        performed.getMonth(),
        performed.getDate(),
        18,
        setIndex,
      ).toISOString(),
    })),
  };
}

function buildReportSampleSession(exerciseIdBySlug, spec, performed) {
  const sessionId = randomUUID();
  const sessionExercises = [];
  const sets = [];
  spec.exercises.forEach((exercise, index) => {
    const sessionExerciseId = randomUUID();
    sessionExercises.push({
      id: sessionExerciseId,
      session_id: sessionId,
      exercise_id: exerciseIdBySlug.get(exercise.slug),
      position: index + 1,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      target_weight_kg: exercise.targetKg,
      base_weight_kg: exercise.baseKg,
      notes: exercise.exerciseNote ?? null,
      not_done: exercise.skipped === true,
    });
    (exercise.sets ?? []).forEach((set, setIndex) => {
      sets.push({
        session_exercise_id: sessionExerciseId,
        set_number: setIndex + 1,
        reps: set[0],
        weight_kg: set[1],
        is_warmup: set[2] === true,
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
  return {
    sessions: [
      {
        id: sessionId,
        performed_on: toYyyyMmDd(performed),
        notes: spec.sessionNote ? `${spec.note} — ${spec.sessionNote}` : spec.note,
        plan_id: null,
        plan_day_id: null,
        source_template_id: null,
        ...finishedTimestamps(performed),
      },
    ],
    sessionExercises,
    sets,
  };
}

async function seedMissingReportSampleSessions(supabase, userId, exerciseIdBySlug) {
  const { data: existing, error } = await supabase
    .from("workout_sessions")
    .select("notes")
    .eq("user_id", userId)
    .like("notes", "Report sample:%");
  if (error) {
    throw new Error(`Could not read report sample sessions: ${error.message}`);
  }
  const have = new Set((existing ?? []).map((row) => (row.notes ?? "").split(" — ")[0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let added = 0;
  for (const spec of REPORT_SAMPLE_SESSIONS) {
    if (have.has(spec.note)) {
      continue;
    }
    const performed = addDays(today, -spec.daysAgo);
    const built = buildReportSampleSession(exerciseIdBySlug, spec, performed);
    await insertChunks(
      supabase,
      "workout_sessions",
      built.sessions.map((session) => ({ ...session, user_id: userId })),
    );
    await insertChunks(supabase, "workout_session_exercises", built.sessionExercises);
    if (built.sets.length > 0) {
      await insertChunks(supabase, "workout_sets", built.sets);
    }
    added += 1;
  }
  return added;
}

function buildNoBaseSession(exerciseId, spec, performed) {
  const sessionId = randomUUID();
  const sessionExerciseId = randomUUID();
  const workingCount = spec.sets.filter((set) => !set.isWarmup).length;
  return {
    sessions: [
      {
        id: sessionId,
        performed_on: toYyyyMmDd(performed),
        notes: spec.note,
        plan_id: null,
        plan_day_id: null,
        source_template_id: null,
        ...finishedTimestamps(performed),
      },
    ],
    sessionExercises: [
      {
        id: sessionExerciseId,
        session_id: sessionId,
        exercise_id: exerciseId,
        position: 1,
        target_sets: workingCount,
        target_reps: spec.targetReps,
        target_weight_kg: spec.targetKg,
        base_weight_kg: null,
        notes: null,
      },
    ],
    sets: spec.sets.map((set, setIndex) => ({
      session_exercise_id: sessionExerciseId,
      set_number: setIndex + 1,
      reps: set.reps,
      weight_kg: set.weightKg,
      is_warmup: set.isWarmup,
      performed_at: new Date(
        performed.getFullYear(),
        performed.getMonth(),
        performed.getDate(),
        19,
        setIndex,
      ).toISOString(),
    })),
  };
}

async function seedMissingNoBaseSessions(supabase, userId, exerciseIdBySlug) {
  const notes = NO_BASE_SESSIONS.map((spec) => spec.note);
  const { data: existing, error } = await supabase
    .from("workout_sessions")
    .select("notes")
    .eq("user_id", userId)
    .in("notes", notes);
  if (error) {
    throw new Error(`Could not read no-base sessions: ${error.message}`);
  }
  const have = new Set((existing ?? []).map((row) => row.notes));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let added = 0;
  for (const spec of NO_BASE_SESSIONS) {
    if (have.has(spec.note)) {
      continue;
    }
    const exerciseId = exerciseIdBySlug.get(spec.slug);
    const performed = addDays(today, -spec.daysAgo);
    const built = buildNoBaseSession(exerciseId, spec, performed);
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

async function seedMissingAssistedDipSessions(supabase, userId, exerciseId) {
  const notes = ASSISTED_DIP_SESSIONS.map((spec) => spec.note);
  const { data: existing, error } = await supabase
    .from("workout_sessions")
    .select("notes")
    .eq("user_id", userId)
    .in("notes", notes);
  if (error) {
    throw new Error(`Could not read Assisted Dip sessions: ${error.message}`);
  }
  const have = new Set((existing ?? []).map((row) => row.notes));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let added = 0;
  for (const spec of ASSISTED_DIP_SESSIONS) {
    if (have.has(spec.note)) {
      continue;
    }
    const performed = addDays(today, -spec.daysAgo);
    const built = buildAssistedDipSession(exerciseId, spec, performed);
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

async function seedMissingPlanSquatFollowUp(supabase, userId, exerciseId) {
  const { data: existing, error: existingError } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("notes", PLAN_SQUAT_FOLLOW_UP.note)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Could not read the plan squat follow-up: ${existingError.message}`);
  }
  if (existing?.id) {
    return 0;
  }

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("name", PLAN_SQUAT_FOLLOW_UP.planName)
    .maybeSingle();
  if (planError) {
    throw new Error(`Could not read the Full body plan: ${planError.message}`);
  }
  if (!plan?.id) {
    return 0;
  }

  const { data: day, error: dayError } = await supabase
    .from("workout_plan_days")
    .select("id")
    .eq("plan_id", plan.id)
    .eq("name", PLAN_SQUAT_FOLLOW_UP.dayName)
    .maybeSingle();
  if (dayError) {
    throw new Error(`Could not read Full Body #1: ${dayError.message}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const performed = addDays(today, -PLAN_SQUAT_FOLLOW_UP.daysAgo);
  const sessionId = randomUUID();
  const sessionExerciseId = randomUUID();
  const { error: sessionError } = await supabase.from("workout_sessions").insert({
    id: sessionId,
    user_id: userId,
    performed_on: toYyyyMmDd(performed),
    notes: PLAN_SQUAT_FOLLOW_UP.note,
    plan_id: plan.id,
    plan_day_id: day?.id ?? null,
    source_template_id: null,
    ...finishedTimestamps(performed),
  });
  if (sessionError) {
    throw new Error(`Could not add the plan squat follow-up: ${sessionError.message}`);
  }

  const { error: exerciseError } = await supabase.from("workout_session_exercises").insert({
    id: sessionExerciseId,
    session_id: sessionId,
    exercise_id: exerciseId,
    position: 1,
    target_sets: PLAN_SQUAT_FOLLOW_UP.sets,
    target_reps: PLAN_SQUAT_FOLLOW_UP.reps,
    target_weight_kg: PLAN_SQUAT_FOLLOW_UP.loadedKg,
    base_weight_kg: null,
    notes: null,
  });
  if (exerciseError) {
    throw new Error(`Could not add the plan squat follow-up exercise: ${exerciseError.message}`);
  }

  const sets = [
    { reps: 5, weight_kg: 60, is_warmup: true },
    ...Array.from({ length: PLAN_SQUAT_FOLLOW_UP.sets }, () => ({
      reps: PLAN_SQUAT_FOLLOW_UP.reps,
      weight_kg: PLAN_SQUAT_FOLLOW_UP.loadedKg,
      is_warmup: false,
    })),
  ];
  const { error: setsError } = await supabase.from("workout_sets").insert(
    sets.map((set, setIndex) => ({
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
    })),
  );
  if (setsError) {
    throw new Error(`Could not add the plan squat follow-up sets: ${setsError.message}`);
  }
  return 1;
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

  const slugs = [
    ...Object.values(LIFTS).map((lift) => lift.slug),
    ASSISTED_DIP_SLUG,
    ...new Set(NO_BASE_SESSIONS.map((spec) => spec.slug)),
    ...new Set(REPORT_SAMPLE_SESSIONS.flatMap((spec) => spec.exercises.map((exercise) => exercise.slug))),
  ];
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

  const seededAssistedDipSessions = await seedMissingAssistedDipSessions(
    supabase,
    userId,
    exerciseIdBySlug.get(ASSISTED_DIP_SLUG),
  );
  sessionCount += seededAssistedDipSessions;

  const seededNoBaseSessions = await seedMissingNoBaseSessions(supabase, userId, exerciseIdBySlug);
  sessionCount += seededNoBaseSessions;

  const seededReportSamples = await seedMissingReportSampleSessions(supabase, userId, exerciseIdBySlug);
  sessionCount += seededReportSamples;

  const seededPlanSquat = await seedMissingPlanSquatFollowUp(
    supabase,
    userId,
    exerciseIdBySlug.get(LIFTS.squat.slug),
  );
  sessionCount += seededPlanSquat;

  const createdLabel = created ? "Created" : "Using";
  const templateNames = templates.map((template) => template.name).join(", ");
  const templateCreated = templates.filter((template) => template.created).length;
  const addedBits = [
    seededPlanSessions ? `+${seededPlanSessions} history` : null,
    seededTemplateSessions ? `+${seededTemplateSessions} template` : null,
    seededPlannedSessions ? `+${seededPlannedSessions} planned` : null,
    seededAssistedDipSessions ? `+${seededAssistedDipSessions} assisted dip` : null,
    seededNoBaseSessions ? `+${seededNoBaseSessions} no base` : null,
    seededReportSamples ? `+${seededReportSamples} report sample` : null,
    seededPlanSquat ? `+${seededPlanSquat} plan squat` : null,
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
