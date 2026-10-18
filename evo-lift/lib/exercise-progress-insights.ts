import { isAssistanceExercise } from "@/lib/assistance-exercise";
import type { ProfileSex } from "@/lib/body-metrics";
import { bodyweightOnOrBefore, type BodyweightLogEntry } from "@/lib/bodyweight-log";
import type { ExerciseWorkingSetSample } from "@/lib/insights-data";
import { classifyExrxLift, EXRX_AGE_BAND, exrxTableUrl, isPublicStandardLift } from "@/lib/strength-standards";

export type ProgressRead = "ahead" | "on-track" | "room" | "down" | "early";

export type ExerciseProgressRow = {
  exerciseId: string;
  slug: string;
  label: string;
  sessionCount: number;
  latestE1rmKg: number | null;
  bestE1rmKg: number | null;
  /** Session date of the working set behind `bestE1rmKg`. */
  bestPerformedOn: string | null;
  changeKg: number | null;
  read: ProgressRead;
  detail: string;
};

export type LiftBalanceNote = {
  id: string;
  slugs: string[];
  title: string;
  titleSlug: string | null;
  badge: string;
  kind: "public" | "balance" | "coverage";
  detail: string;
  /** When set, the words “ExRx table” in `detail` link here. */
  tableHref: string | null;
  meta: string | null;
};

export type LifterProfile = {
  sex: ProfileSex | null;
  /** Latest account bodyweight. Used only when the log is empty. */
  bodyweightKg: number | null;
  bodyweightEntries: readonly BodyweightLogEntry[];
  ageYears: number | null;
  ageIsApproximate: boolean;
};

export type ExerciseProgressReport = {
  summary: string;
  rows: ExerciseProgressRow[];
  balanceNotes: LiftBalanceNote[];
  publicNotes: LiftBalanceNote[];
  comparisonHint: string | null;
};

const MIN_SESSIONS = 3;
const MIN_SPAN_DAYS = 14;
const DOWN_KG = 2.5;

/**
 * Steady monthly gain for someone past the first months of training.
 * Squat and deadlift sit in the published 1–2.5 kg/month band. Bench, row, and
 * press are slower. Other exercises use a modest default.
 */
function steadyMonthlyGainKg(slug: string): number {
  if (
    slug === "back-squat" ||
    slug === "front-squat" ||
    slug === "deadlift" ||
    slug === "sumo-deadlift" ||
    slug === "trap-bar-deadlift" ||
    slug === "barbell-romanian-deadlift" ||
    slug === "barbell-hip-thrust"
  ) {
    return 1.5;
  }
  if (
    slug === "barbell-bench-press" ||
    slug === "barbell-incline-press" ||
    slug === "close-grip-bench-press" ||
    slug === "barbell-bent-over-row"
  ) {
    return 1;
  }
  if (slug === "overhead-press") {
    return 0.5;
  }
  return 0.75;
}

/** Epley estimate. Sets above 12 reps are left out; those estimates drift. */
export function estimateEpley1Rm(totalKg: number, reps: number): number | null {
  if (!Number.isFinite(totalKg) || totalKg <= 0 || !Number.isFinite(reps) || reps < 1 || reps > 12) {
    return null;
  }
  if (reps === 1) {
    return totalKg;
  }
  return totalKg * (1 + reps / 30);
}

function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function signedKg(value: number): string {
  const amount = formatKg(Math.abs(value));
  if (value > 0.05) {
    return `+${amount}`;
  }
  if (value < -0.05) {
    return `−${amount}`;
  }
  return formatKg(0);
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

type SessionPeak = {
  sessionId: string;
  performedOn: string;
  e1rmKg: number;
};

function sessionPeaks(samples: ExerciseWorkingSetSample[]): SessionPeak[] {
  const bySession = new Map<string, SessionPeak>();
  for (const sample of samples) {
    const estimate = estimateEpley1Rm(sample.totalKg, sample.reps);
    if (estimate == null) {
      continue;
    }
    const current = bySession.get(sample.sessionId);
    if (!current || estimate > current.e1rmKg) {
      bySession.set(sample.sessionId, {
        sessionId: sample.sessionId,
        performedOn: sample.performedOn,
        e1rmKg: estimate,
      });
    }
  }
  return [...bySession.values()].sort((left, right) => {
    const byDate = left.performedOn.localeCompare(right.performedOn);
    if (byDate !== 0) {
      return byDate;
    }
    return left.sessionId.localeCompare(right.sessionId);
  });
}

function readRank(read: ProgressRead): number {
  switch (read) {
    case "room":
      return 0;
    case "down":
      return 1;
    case "on-track":
      return 2;
    case "ahead":
      return 3;
    case "early":
      return 4;
  }
}

export function progressReadLabel(read: ProgressRead): string {
  switch (read) {
    case "ahead":
      return "Ahead";
    case "on-track":
      return "On track";
    case "room":
      return "Room to gain";
    case "down":
      return "Down";
    case "early":
      return "More sessions";
  }
}

type BalancePair = {
  id: string;
  numeratorSlug: string;
  denominatorSlug: string;
  low: number;
  high: number;
  usual: string;
};

const BALANCE_PAIRS: BalancePair[] = [
  { id: "squat-deadlift", numeratorSlug: "back-squat", denominatorSlug: "deadlift", low: 0.8, high: 0.95, usual: "80–90%" },
  {
    id: "bench-squat",
    numeratorSlug: "barbell-bench-press",
    denominatorSlug: "back-squat",
    low: 0.65,
    high: 0.85,
    usual: "65–85%",
  },
  {
    id: "press-bench",
    numeratorSlug: "overhead-press",
    denominatorSlug: "barbell-bench-press",
    low: 0.55,
    high: 0.8,
    usual: "60–75%",
  },
  {
    id: "row-bench",
    numeratorSlug: "barbell-bent-over-row",
    denominatorSlug: "barbell-bench-press",
    low: 0.75,
    high: 1.05,
    usual: "80–100%",
  },
  {
    id: "rdl-deadlift",
    numeratorSlug: "barbell-romanian-deadlift",
    denominatorSlug: "deadlift",
    low: 0.65,
    high: 0.9,
    usual: "70–85%",
  },
  {
    id: "close-bench",
    numeratorSlug: "close-grip-bench-press",
    denominatorSlug: "barbell-bench-press",
    low: 0.85,
    high: 1,
    usual: "90–95%",
  },
  {
    id: "hip-squat",
    numeratorSlug: "barbell-hip-thrust",
    denominatorSlug: "back-squat",
    low: 1.2,
    high: 1.8,
    usual: "130–170%",
  },
];


type MovementPattern = {
  id: string;
  name: string;
  exampleLabel: string;
  slugs: string[];
};

const MOVEMENT_PATTERNS: Record<string, MovementPattern> = {
  squat: {
    id: "squat",
    name: "squat",
    exampleLabel: "Barbell Back Squat",
    slugs: ["back-squat", "front-squat", "goblet-squat", "hack-squat", "bulgarian-split-squat", "leg-press"],
  },
  hinge: {
    id: "hinge",
    name: "hinge",
    exampleLabel: "Barbell Deadlift",
    slugs: [
      "deadlift",
      "sumo-deadlift",
      "trap-bar-deadlift",
      "barbell-romanian-deadlift",
      "dumbbell-romanian-deadlift",
      "barbell-hip-thrust",
      "cable-pull-through",
      "back-extension",
    ],
  },
  horizontalPress: {
    id: "horizontal-press",
    name: "horizontal press",
    exampleLabel: "Barbell Bench Press",
    slugs: [
      "barbell-bench-press",
      "barbell-incline-press",
      "close-grip-bench-press",
      "dumbbell-bench-press",
      "dumbbell-floor-press",
      "dumbbell-incline-press",
      "machine-chest-press",
      "machine-incline-chest-press",
      "push-up",
    ],
  },
  verticalPress: {
    id: "vertical-press",
    name: "vertical press",
    exampleLabel: "Barbell Overhead Press",
    slugs: ["overhead-press", "dumbbell-overhead-press", "dumbbell-seated-shoulder-press", "arnold-press"],
  },
  horizontalPull: {
    id: "horizontal-pull",
    name: "horizontal pull",
    exampleLabel: "Barbell Bent Over Row",
    slugs: [
      "barbell-bent-over-row",
      "dumbbell-row",
      "cable-seated-row",
      "chest-supported-row",
      "chest-supported-t-bar-row",
    ],
  },
  verticalPull: {
    id: "vertical-pull",
    name: "vertical pull",
    exampleLabel: "Lat Pulldown",
    slugs: [
      "lat-pulldown",
      "neutral-grip-pulldown",
      "reverse-grip-lat-pulldown",
      "single-arm-pulldown",
      "pull-up",
      "chin-up",
      "assisted-pull-up",
    ],
  },
};

const PATTERN_GAPS: Array<{ have: string; missing: string }> = [
  { have: "horizontalPress", missing: "horizontalPull" },
  { have: "verticalPress", missing: "verticalPull" },
  { have: "squat", missing: "hinge" },
  { have: "hinge", missing: "squat" },
  { have: "horizontalPull", missing: "horizontalPress" },
  { have: "verticalPull", missing: "verticalPress" },
];

const PUBLIC_LIFT_ORDER = ["back-squat", "barbell-bench-press", "deadlift", "overhead-press"];

function buildBalanceNotes(rows: ExerciseProgressRow[]): LiftBalanceNote[] {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const notes: LiftBalanceNote[] = [];
  for (const pair of BALANCE_PAIRS) {
    const numerator = bySlug.get(pair.numeratorSlug);
    const denominator = bySlug.get(pair.denominatorSlug);
    if (
      !numerator ||
      !denominator ||
      numerator.sessionCount < MIN_SESSIONS ||
      denominator.sessionCount < MIN_SESSIONS ||
      numerator.bestE1rmKg == null ||
      denominator.bestE1rmKg == null ||
      denominator.bestE1rmKg <= 0
    ) {
      continue;
    }
    const ratio = numerator.bestE1rmKg / denominator.bestE1rmKg;
    const percent = Math.round(ratio * 100);
    if (ratio < pair.low - 0.05) {
      notes.push({
        id: pair.id,
        slugs: [numerator.slug, denominator.slug],
        title: numerator.label,
        titleSlug: numerator.slug,
        badge: "Below usual",
        kind: "balance",
        detail: `${percent}% of your ${denominator.label}. A usual balance is about ${pair.usual}, so more ${numerator.label} progress would be expected.`,
        tableHref: null,
        meta: null,
      });
      continue;
    }
    if (ratio > pair.high + 0.05) {
      notes.push({
        id: pair.id,
        slugs: [numerator.slug, denominator.slug],
        title: denominator.label,
        titleSlug: denominator.slug,
        badge: "Below usual",
        kind: "balance",
        detail: `${numerator.label} is ${percent}% of your ${denominator.label}. A usual balance is about ${pair.usual}, so more ${denominator.label} progress would be expected.`,
        tableHref: null,
        meta: null,
      });
    }
  }
  return notes;
}

function loggedLabels(samples: ExerciseWorkingSetSample[], slugs: string[]): string[] {
  const labels = new Map<string, string>();
  for (const sample of samples) {
    if (slugs.includes(sample.slug)) {
      labels.set(sample.slug, sample.label);
    }
  }
  return [...labels.values()];
}

function buildPatternNotes(samples: ExerciseWorkingSetSample[], rows: ExerciseProgressRow[]): LiftBalanceNote[] {
  const notes: LiftBalanceNote[] = [];
  for (const gap of PATTERN_GAPS) {
    const have = MOVEMENT_PATTERNS[gap.have];
    const missing = MOVEMENT_PATTERNS[gap.missing];
    const established = rows
      .filter((row) => have.slugs.includes(row.slug) && row.sessionCount >= MIN_SESSIONS)
      .sort((left, right) => left.label.localeCompare(right.label));
    if (established.length === 0 || loggedLabels(samples, missing.slugs).length > 0) {
      continue;
    }
    notes.push({
      id: `pattern-${have.id}-${missing.id}`,
      slugs: established.map((row) => row.slug),
      title: joinLabels(established.map((row) => row.label)),
      titleSlug: established.length === 1 ? established[0].slug : null,
      badge: "Missing",
      kind: "balance",
      detail: `No ${missing.name} in this range. A usual mix also includes one, for example ${missing.exampleLabel}.`,
      tableHref: null,
      meta: null,
    });
  }
  return notes.slice(0, 4);
}

type BodyPart = {
  id: string;
  name: string;
  exampleLabel: string;
  slugs: string[];
};

const BODY_PARTS: BodyPart[] = [
  {
    id: "chest",
    name: "Chest",
    exampleLabel: "Barbell Bench Press",
    slugs: [
      "barbell-bench-press",
      "barbell-incline-press",
      "close-grip-bench-press",
      "dumbbell-bench-press",
      "dumbbell-floor-press",
      "dumbbell-incline-press",
      "dumbbell-flye",
      "machine-chest-press",
      "machine-incline-chest-press",
      "cable-flye",
      "pec-deck",
      "assisted-dip",
      "push-up",
    ],
  },
  {
    id: "back",
    name: "Back",
    exampleLabel: "Barbell Bent Over Row",
    slugs: [
      "barbell-bent-over-row",
      "dumbbell-row",
      "cable-seated-row",
      "chest-supported-row",
      "chest-supported-t-bar-row",
      "lat-pulldown",
      "neutral-grip-pulldown",
      "reverse-grip-lat-pulldown",
      "single-arm-pulldown",
      "pull-up",
      "chin-up",
      "assisted-pull-up",
      "deadlift",
      "sumo-deadlift",
      "trap-bar-deadlift",
      "barbell-romanian-deadlift",
      "dumbbell-romanian-deadlift",
      "back-extension",
    ],
  },
  {
    id: "shoulders",
    name: "Shoulders",
    exampleLabel: "Barbell Overhead Press",
    slugs: [
      "overhead-press",
      "dumbbell-overhead-press",
      "dumbbell-seated-shoulder-press",
      "arnold-press",
      "dumbbell-lateral-raise",
      "cable-lateral-raise",
      "machine-lateral-raise",
      "cable-reverse-flye",
      "bent-over-reverse-dumbbell-flye",
      "reverse-pec-deck",
      "seated-face-pull",
    ],
  },
  {
    id: "arms",
    name: "Arms",
    exampleLabel: "EZ Bar Curl",
    slugs: [
      "dumbbell-supinated-curl",
      "ez-bar-curl",
      "barbell-curl",
      "cable-curl",
      "hammer-curl",
      "single-arm-cable-curl",
      "cable-tricep-kickback",
      "cable-tricep-pushdown",
      "dumbbell-skull-crusher",
      "single-arm-rope-tricep-extension",
      "close-grip-bench-press",
      "assisted-dip",
    ],
  },
  {
    id: "legs",
    name: "Legs",
    exampleLabel: "Barbell Back Squat",
    slugs: [
      "back-squat",
      "front-squat",
      "goblet-squat",
      "hack-squat",
      "bulgarian-split-squat",
      "dumbbell-walking-lunge",
      "leg-press",
      "leg-extension",
      "single-leg-leg-extension",
      "lying-leg-curl",
      "seated-leg-curl",
      "single-leg-lying-leg-curl",
      "barbell-hip-thrust",
      "dumbbell-single-leg-hip-thrust",
      "glute-bridge",
      "cable-pull-through",
      "deadlift",
      "sumo-deadlift",
      "trap-bar-deadlift",
      "barbell-romanian-deadlift",
      "dumbbell-romanian-deadlift",
      "machine-seated-hip-abduction",
    ],
  },
  {
    id: "core",
    name: "Core",
    exampleLabel: "Plank",
    slugs: ["crunch", "bicycle-crunch", "cable-crunch", "hanging-leg-raise", "plank", "pallof-press"],
  },
  {
    id: "calves",
    name: "Calves",
    exampleLabel: "Standing Calf Raise",
    slugs: ["standing-calf-raise", "seated-calf-raise"],
  },
];

function buildCoverageNotes(samples: ExerciseWorkingSetSample[]): LiftBalanceNote[] {
  if (samples.length === 0) {
    return [];
  }
  const logged = new Set(samples.map((sample) => sample.slug));
  const notes: LiftBalanceNote[] = [];
  for (const part of BODY_PARTS) {
    if (part.slugs.some((slug) => logged.has(slug))) {
      continue;
    }
    notes.push({
      id: `coverage-${part.id}`,
      slugs: [],
      title: part.name,
      titleSlug: null,
      badge: "Not trained",
      kind: "coverage",
      detail: `No loaded working sets for ${part.name.toLowerCase()} in this range. An example is ${part.exampleLabel}.`,
      tableHref: null,
      meta: null,
    });
  }
  return notes;
}

function bodyweightForEstimate(profile: LifterProfile, performedOn: string | null): number | null {
  if (profile.bodyweightEntries.length > 0) {
    if (!performedOn) {
      return null;
    }
    return bodyweightOnOrBefore(profile.bodyweightEntries, performedOn);
  }
  return profile.bodyweightKg != null && profile.bodyweightKg > 0 ? profile.bodyweightKg : null;
}

function buildPublicComparison(
  rows: ExerciseProgressRow[],
  profile: LifterProfile,
): { publicNotes: LiftBalanceNote[]; comparisonHint: string | null } {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const gradedLifts = PUBLIC_LIFT_ORDER.flatMap((slug) => {
    const row = bySlug.get(slug);
    return row?.bestE1rmKg != null ? [row] : [];
  });
  const hasBodyweight = gradedLifts.some(
    (row) => bodyweightForEstimate(profile, row.bestPerformedOn) != null,
  );
  const canGrade = profile.sex != null && hasBodyweight && profile.ageYears != null && profile.ageYears >= 18;

  if (!canGrade) {
    if (profile.ageYears != null && profile.ageYears < 18 && profile.sex != null && hasBodyweight) {
      return {
        publicNotes: [],
        comparisonHint: "Public standards here start at age 18, so no general-public level is shown.",
      };
    }
    if (gradedLifts.length === 0) {
      return { publicNotes: [], comparisonHint: null };
    }
    return {
      publicNotes: [],
      comparisonHint:
        "Add sex, date of birth, and bodyweight on Account to compare Barbell Back Squat, Barbell Bench Press, Barbell Deadlift, and Barbell Overhead Press with published standards.",
    };
  }

  const sexWord = profile.sex === "female" ? "women" : "men";
  const publicNotes: LiftBalanceNote[] = [];
  for (const row of gradedLifts) {
    const bodyweightKg = bodyweightForEstimate(profile, row.bestPerformedOn);
    if (row.bestE1rmKg == null || profile.sex == null || bodyweightKg == null || !isPublicStandardLift(row.slug)) {
      continue;
    }
    const level = classifyExrxLift(row.slug, row.bestE1rmKg, profile.sex, bodyweightKg);
    if (level == null) {
      continue;
    }
    const multiple = (row.bestE1rmKg / bodyweightKg).toFixed(1);
    publicNotes.push({
      id: `public-${row.slug}`,
      slugs: [row.slug],
      title: row.label,
      titleSlug: row.slug,
      badge: level,
      kind: "public",
      detail: `On the ExRx table for ${sexWord}, ages ${EXRX_AGE_BAND}.`,
      tableHref: exrxTableUrl(row.slug),
      meta: `Best est. 1RM ${formatKg(row.bestE1rmKg)} · ${multiple}× bodyweight`,
    });
  }

  const hints: string[] = [];
  if (profile.ageYears != null && profile.ageYears >= 40) {
    hints.push(
      "These levels use the ExRx table for ages 18–39. ExRx publishes lower standards from age 40, so a level can look harder than an age-matched table.",
    );
  }
  if (profile.ageIsApproximate) {
    hints.push("Age is estimated from the year of birth on your profile.");
  }
  return { publicNotes, comparisonHint: hints.length > 0 ? hints.join(" ") : null };
}

function groupSentence(
  labels: string[],
  singular: (label: string) => string,
  plural: (count: number) => string,
): string | null {
  if (labels.length === 0) {
    return null;
  }
  if (labels.length === 1) {
    return singular(labels[0]);
  }
  return plural(labels.length);
}

function buildSummary(rows: ExerciseProgressRow[]): string {
  const judged = rows.filter((row) => row.read !== "early");
  if (judged.length === 0) {
    return "Log the same exercise on at least 3 sessions, spread over 2 weeks, to judge progress.";
  }
  const ahead = judged.filter((row) => row.read === "ahead").map((row) => row.label);
  const onTrack = judged.filter((row) => row.read === "on-track").map((row) => row.label);
  const room = judged.filter((row) => row.read === "room").map((row) => row.label);
  const down = judged.filter((row) => row.read === "down").map((row) => row.label);
  return [
    groupSentence(
      ahead,
      (label) => `${label} is ahead of a steady rate.`,
      (count) => `${count} exercises are ahead of a steady rate.`,
    ),
    groupSentence(
      onTrack,
      (label) => `${label} is on a steady rate.`,
      (count) => `${count} exercises are on a steady rate.`,
    ),
    groupSentence(
      room,
      (label) => `${label} has room to gain. More progress there would be expected.`,
      (count) => `${count} exercises have room to gain. More progress there would be expected.`,
    ),
    groupSentence(
      down,
      (label) => `${label} is down from the start of this range.`,
      (count) => `${count} exercises are down from the start of this range.`,
    ),
  ]
    .filter((sentence): sentence is string => sentence != null)
    .join(" ");
}

export function buildExerciseProgressReport(
  samples: ExerciseWorkingSetSample[],
  range: { from: string; to: string },
  profile: LifterProfile,
): ExerciseProgressReport {
  const filtered = samples.filter((sample) => {
    if (range.from && sample.performedOn < range.from) {
      return false;
    }
    if (range.to && sample.performedOn > range.to) {
      return false;
    }
    return true;
  });

  const byExercise = new Map<string, ExerciseWorkingSetSample[]>();
  for (const sample of filtered) {
    const list = byExercise.get(sample.exerciseId) ?? [];
    list.push(sample);
    byExercise.set(sample.exerciseId, list);
  }

  const rows: ExerciseProgressRow[] = [];
  for (const [exerciseId, exerciseSamples] of byExercise) {
    const first = exerciseSamples[0];
    const peaks = sessionPeaks(exerciseSamples);
    if (peaks.length === 0) {
      continue;
    }
    const earliest = peaks[0];
    const latest = peaks[peaks.length - 1];
    const best = peaks.reduce((current, peak) => (peak.e1rmKg > current.e1rmKg ? peak : current));
    const changeKg = latest.e1rmKg - earliest.e1rmKg;
    const spanDays = daysBetween(earliest.performedOn, latest.performedOn);
    const monthly = steadyMonthlyGainKg(first.slug);
    const expectedKg = monthly * (spanDays / 30.44);
    const sessionCount = peaks.length;

    if (isAssistanceExercise(first.slug)) {
      rows.push({
        exerciseId,
        slug: first.slug,
        label: first.label,
        sessionCount,
        latestE1rmKg: latest.e1rmKg,
        bestE1rmKg: null,
        bestPerformedOn: null,
        changeKg: null,
        read: "early",
        detail: `${first.label} logs the assistance, not the load, so this weight is not used for progress or comparisons.`,
      });
      continue;
    }

    let read: ProgressRead = "early";
    if (sessionCount >= MIN_SESSIONS && spanDays >= MIN_SPAN_DAYS) {
      if (changeKg <= -DOWN_KG) {
        read = "down";
      } else if (changeKg >= Math.max(expectedKg * 1.75, 2.5)) {
        read = "ahead";
      } else if (changeKg >= expectedKg * 0.5) {
        read = "on-track";
      } else {
        read = "room";
      }
    }

    const bestClause =
      best.e1rmKg > latest.e1rmKg + 1
        ? ` Best in this range was ${formatKg(best.e1rmKg)}.`
        : "";
    const changeText = Math.abs(changeKg) < 0.05 ? "Unchanged" : signedKg(changeKg);
    let detail: string;
    if (read === "early") {
      detail = `${sessionCount} session${sessionCount === 1 ? "" : "s"} with an estimated 1RM. At least 3 sessions over 2 weeks are needed to judge progress.`;
    } else if (read === "down") {
      detail = `${changeText} since the first session in this range. Latest estimated 1RM is ${formatKg(latest.e1rmKg)}.${bestClause}`;
    } else if (read === "ahead") {
      detail = `${changeText} over ${sessionCount} sessions. A steady rate for this lift is about ${formatKg(monthly)} per month.`;
    } else if (read === "on-track") {
      detail = `${changeText} over ${sessionCount} sessions, in line with about ${formatKg(monthly)} per month.`;
    } else {
      detail = `${changeText} over ${sessionCount} sessions. A steady rate is about ${formatKg(monthly)} per month, so more progress would be expected.`;
    }

    rows.push({
      exerciseId,
      slug: first.slug,
      label: first.label,
      sessionCount,
      latestE1rmKg: latest.e1rmKg,
      bestE1rmKg: best.e1rmKg,
      bestPerformedOn: best.performedOn,
      changeKg,
      read,
      detail,
    });
  }

  rows.sort((left, right) => {
    const byRead = readRank(left.read) - readRank(right.read);
    if (byRead !== 0) {
      return byRead;
    }
    return left.label.localeCompare(right.label);
  });

  const comparison = buildPublicComparison(rows, profile);

  return {
    summary: buildSummary(rows),
    rows,
    balanceNotes: [...buildBalanceNotes(rows), ...buildPatternNotes(filtered, rows), ...buildCoverageNotes(filtered)],
    publicNotes: comparison.publicNotes,
    comparisonHint: comparison.comparisonHint,
  };
}
