import { estimateEpley1Rm } from "@/lib/exercise-progress-insights";
import { INSIGHTS_COMPOUND_E1RM_LIFTS } from "@/lib/insights-compound-e1rm";
import { MUSCLE_AREAS, muscleAreaLabel, type MuscleArea } from "@/lib/muscle-areas";

/** One time a plan was active. Dates are `YYYY-MM-DD`. A null end means it is still active. */
export type PlanActivationSpan = {
  activatedOn: string;
  deactivatedOn: string | null;
};

export type PlanInsightSession = {
  id: string;
  performedOn: string;
  completed: boolean;
};

/** One exercise row on a session that belongs to the plan. Working sets exclude warmups. */
export type PlanInsightExercise = {
  sessionId: string;
  targetSets: number | null;
  notDone: boolean;
  workingSetCount: number;
};

/** One working set logged on a plan session. */
export type PlanInsightSet = {
  sessionId: string;
  performedOn: string;
  slug: string;
  reps: number;
  totalKg: number;
  primaryMuscle: MuscleArea | null;
};

/** Best estimated 1RM on one session of a main lift. */
export type PlanInsightLiftPoint = {
  sessionId: string;
  performedOn: string;
  e1rmKg: number;
};

export type PlanInsightLift = {
  slug: string;
  label: string;
  /** One point per session, earliest first. */
  points: PlanInsightLiftPoint[];
  /** Best estimated 1RM on the first session that has one, then the last. */
  summary: string;
  changeKg: number | null;
};

export type PlanInsightMuscleVolume = {
  area: MuscleArea;
  label: string;
  kgPerWeek: number;
};

export type PlanInsights = {
  startedOn: string | null;
  endedOn: string | null;
  stillActive: boolean;
  activeDays: number;
  sessionCount: number;
  sessionsPerWeek: number | null;
  plannedSets: number;
  performedSets: number;
  shortSets: number;
  lifts: PlanInsightLift[];
  weeklyVolume: PlanInsightMuscleVolume[];
};

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

function inclusiveDays(start: string, end: string): number {
  if (end < start) {
    return 0;
  }
  return dayNumber(end) - dayNumber(start) + 1;
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatKg(value: number): string {
  return `${roundTenth(value).toFixed(1)} kg`;
}

type ClosedSpan = { start: string; end: string };

function mergedActiveSpans(
  activations: readonly PlanActivationSpan[],
  today: string,
): { spans: ClosedSpan[]; stillActive: boolean } {
  const spans: ClosedSpan[] = [];
  let stillActive = false;
  for (const activation of activations) {
    if (activation.activatedOn > today) {
      continue;
    }
    if (activation.deactivatedOn === null) {
      stillActive = true;
    }
    const end = activation.deactivatedOn === null || activation.deactivatedOn > today
      ? today
      : activation.deactivatedOn;
    if (end < activation.activatedOn) {
      continue;
    }
    spans.push({ start: activation.activatedOn, end });
  }
  spans.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const merged: ClosedSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (!last || span.start > last.end) {
      merged.push({ ...span });
    } else if (span.end > last.end) {
      last.end = span.end;
    }
  }
  return { spans: merged, stillActive };
}

function adherence(sessions: readonly PlanInsightSession[], exercises: readonly PlanInsightExercise[]) {
  const completed = new Set(sessions.filter((session) => session.completed).map((session) => session.id));
  let plannedSets = 0;
  let performedSets = 0;
  let shortSets = 0;
  for (const exercise of exercises) {
    if (!completed.has(exercise.sessionId)) {
      continue;
    }
    const target = exercise.targetSets;
    if (target == null || target <= 0) {
      continue;
    }
    const performed = exercise.notDone ? 0 : Math.min(exercise.workingSetCount, target);
    plannedSets += target;
    performedSets += performed;
    shortSets += target - performed;
  }
  return { plannedSets, performedSets, shortSets };
}

function liftChange(sets: readonly PlanInsightSet[], slug: string, label: string): PlanInsightLift {
  const bySession = new Map<string, { performedOn: string; e1rmKg: number }>();
  for (const set of sets) {
    if (set.slug !== slug) {
      continue;
    }
    const estimate = estimateEpley1Rm(set.totalKg, set.reps);
    if (estimate == null) {
      continue;
    }
    const current = bySession.get(set.sessionId);
    if (!current || estimate > current.e1rmKg) {
      bySession.set(set.sessionId, { performedOn: set.performedOn, e1rmKg: estimate });
    }
  }
  const points = [...bySession.entries()]
    .map(([sessionId, point]) => ({
      sessionId,
      performedOn: point.performedOn,
      e1rmKg: roundTenth(point.e1rmKg),
    }))
    .sort((a, b) => a.performedOn.localeCompare(b.performedOn) || a.sessionId.localeCompare(b.sessionId));
  if (points.length === 0) {
    return { slug, label, points, summary: "No working sets", changeKg: null };
  }
  const first = points[0].e1rmKg;
  const last = points[points.length - 1].e1rmKg;
  if (points.length === 1) {
    return { slug, label, points, summary: formatKg(first), changeKg: null };
  }
  return {
    slug,
    label,
    points,
    summary: `${formatKg(first)} to ${formatKg(last)}`,
    changeKg: roundTenth(last - first),
  };
}

/**
 * Names the estimated 1RM rows. The comparison clause is only there when a lift
 * has a first session and a later one.
 */
export function planLiftE1rmText(lifts: readonly PlanInsightLift[]): string | null {
  const plotted = lifts.filter((lift) => lift.points.length > 0);
  if (plotted.length === 0) {
    return null;
  }
  if (plotted.some((lift) => lift.points.length > 1)) {
    return "Estimated one-rep max (1RM) from the first session to the latest.";
  }
  return "Estimated one-rep max (1RM).";
}

/** Names the main lifts that have no estimated 1RM on this plan. */
export function planLiftsQuietText(lifts: readonly PlanInsightLift[]): string | null {
  const missing = lifts.filter((lift) => lift.points.length === 0);
  if (missing.length === 0) {
    return null;
  }
  if (missing.length === lifts.length) {
    return "No working sets on the main lifts.";
  }
  const names = missing.map((lift) => lift.label.toLowerCase());
  if (names.length === 1) {
    return `No working sets for ${names[0]}.`;
  }
  if (names.length === 2) {
    return `No working sets for ${names[0]} or ${names[1]}.`;
  }
  const last = names[names.length - 1];
  return `No working sets for ${names.slice(0, -1).join(", ")}, or ${last}.`;
}

function weeklyVolume(sets: readonly PlanInsightSet[], activeDays: number): PlanInsightMuscleVolume[] {
  if (activeDays <= 0) {
    return [];
  }
  const totals = new Map<MuscleArea, number>();
  for (const set of sets) {
    if (set.primaryMuscle == null || set.totalKg <= 0) {
      continue;
    }
    totals.set(set.primaryMuscle, (totals.get(set.primaryMuscle) ?? 0) + set.totalKg);
  }
  return MUSCLE_AREAS.flatMap((area) => {
    const total = totals.get(area);
    if (total == null || total <= 0) {
      return [];
    }
    return [{ area, label: muscleAreaLabel(area), kgPerWeek: roundTenth((total * 7) / activeDays) }];
  });
}

/** Duration, sessions, adherence, main-lift estimated 1RM, and weekly volume for one plan. */
export function buildPlanInsights(input: {
  activations: readonly PlanActivationSpan[];
  sessions: readonly PlanInsightSession[];
  exercises: readonly PlanInsightExercise[];
  sets: readonly PlanInsightSet[];
  today: string;
}): PlanInsights {
  const { spans, stillActive } = mergedActiveSpans(input.activations, input.today);
  const activeDays = spans.reduce((sum, span) => sum + inclusiveDays(span.start, span.end), 0);
  const sets = adherence(input.sessions, input.exercises);
  return {
    startedOn: spans[0]?.start ?? null,
    endedOn: spans.length > 0 ? spans[spans.length - 1].end : null,
    stillActive,
    activeDays,
    sessionCount: input.sessions.length,
    sessionsPerWeek: activeDays > 0 ? roundTenth((input.sessions.length * 7) / activeDays) : null,
    ...sets,
    lifts: INSIGHTS_COMPOUND_E1RM_LIFTS.map((lift) => liftChange(input.sets, lift.slug, lift.shortLabel)),
    weeklyVolume: weeklyVolume(input.sets, activeDays),
  };
}

export function planDurationText(
  insights: PlanInsights,
  formatDate: (isoDate: string) => string,
): string {
  if (!insights.startedOn || !insights.endedOn || insights.activeDays <= 0) {
    return "This plan has not been active.";
  }
  const length = formatActiveLength(insights.activeDays);
  const end = insights.stillActive ? "today" : formatDate(insights.endedOn);
  return `${formatDate(insights.startedOn)} – ${end}, ${length} active`;
}

export function formatActiveLength(activeDays: number): string {
  if (activeDays <= 0) {
    return "0 days";
  }
  if (activeDays < 7) {
    return activeDays === 1 ? "1 day" : `${activeDays} days`;
  }
  const weeks = roundTenth(activeDays / 7);
  const text = Number.isInteger(weeks) ? String(weeks) : weeks.toFixed(1);
  return weeks === 1 ? "1 week" : `${text} weeks`;
}

export function planSessionsText(insights: PlanInsights): string {
  if (insights.sessionCount === 0) {
    return "No sessions logged.";
  }
  const sessions = insights.sessionCount === 1 ? "1 session" : `${insights.sessionCount} sessions`;
  if (insights.sessionsPerWeek == null) {
    return sessions;
  }
  const rate = Number.isInteger(insights.sessionsPerWeek)
    ? String(insights.sessionsPerWeek)
    : insights.sessionsPerWeek.toFixed(1);
  return `${sessions}, ${rate} per week`;
}

export function planAdherenceText(insights: PlanInsights): string {
  if (insights.plannedSets === 0) {
    return "No target sets on finished sessions.";
  }
  const lead = `${insights.performedSets} of ${insights.plannedSets} target sets`;
  if (insights.shortSets === 0) {
    return lead;
  }
  const short =
    insights.shortSets === 1
      ? "1 set short of the target"
      : `${insights.shortSets} sets short of the target`;
  return `${lead}. ${short}.`;
}

/** One paragraph: how long the plan ran, how often, and how many target sets were logged. */
export function planSummaryText(
  insights: PlanInsights,
  formatDate: (isoDate: string) => string,
): string {
  if (!insights.startedOn && insights.sessionCount === 0) {
    return "This plan has not been active.";
  }
  const parts = [planDurationText(insights, formatDate), planSessionsText(insights), planAdherenceText(insights)];
  return parts.map((part) => (part.endsWith(".") ? part : `${part}.`)).join(" ");
}
