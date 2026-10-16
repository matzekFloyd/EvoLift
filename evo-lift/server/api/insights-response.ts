import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import { resolveLifterAge } from "@/lib/body-metrics";
import {
  buildExerciseProgressReport,
  type LifterProfile,
} from "@/lib/exercise-progress-insights";
import { buildInsightsComparisonSentence } from "@/lib/insights-chart-summary";
import {
  applyInsightsRange,
  type InsightsHistory,
  type InsightsRange,
  type UserStrengthProfile,
  type WeeklyVolumePoint,
  type WorkoutActivityPoint,
} from "@/lib/insights-data";
import { ApiHttpError, parseOptionalDateQuery } from "@/server/api/http";

const RANGES = new Set<InsightsRange>(["4w", "12w", "6m", "all"]);

export type InsightsQuery = {
  range: InsightsRange;
  from: string;
  to: string;
};

function toYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseInsightsQuery(params: URLSearchParams, today: Date): InsightsQuery {
  const rawRange = params.get("range");
  let range: InsightsRange = "12w";
  if (rawRange != null && rawRange !== "") {
    if (!RANGES.has(rawRange as InsightsRange)) {
      throw new ApiHttpError(400, "Please choose a range of 4w, 12w, 6m, or all.");
    }
    range = rawRange as InsightsRange;
  }
  const from = parseOptionalDateQuery(params.get("from"), "from date") ?? "";
  const to = parseOptionalDateQuery(params.get("to"), "to date") ?? "";
  const hasDates = params.has("from") || params.has("to");
  if (!rawRange && !hasDates) {
    const preset = getInsightsPresetRange("12w", today);
    return { range: "12w", from: preset.from, to: preset.to };
  }
  if (!hasDates) {
    const preset = getInsightsPresetRange(range, today);
    return { range, from: preset.from, to: preset.to };
  }
  if (!rawRange) {
    range = "all";
  }
  if (from && to && from > to) {
    throw new ApiHttpError(400, "Please enter a from date on or before the to date.");
  }
  return { range, from, to };
}

export function parseActivityQuery(params: URLSearchParams): { from: string; to: string } {
  const from = parseOptionalDateQuery(params.get("from"), "from date") ?? "";
  const to = parseOptionalDateQuery(params.get("to"), "to date") ?? "";
  if (from && to && from > to) {
    throw new ApiHttpError(400, "Please enter a from date on or before the to date.");
  }
  return { from, to };
}

export function parseHistoryQuery(
  params: URLSearchParams,
  today: Date,
): { from: string; to: string; hideWarmups: boolean } {
  const hideRaw = params.get("hide_warmups");
  let hideWarmups = true;
  if (hideRaw != null && hideRaw !== "") {
    const flag = hideRaw.trim().toLowerCase();
    if (flag === "0" || flag === "false" || flag === "no") {
      hideWarmups = false;
    } else if (flag === "1" || flag === "true" || flag === "yes") {
      hideWarmups = true;
    } else {
      throw new ApiHttpError(400, "hide_warmups must be true or false.");
    }
  }
  const hasFrom = params.has("from") && (params.get("from") ?? "") !== "";
  const hasTo = params.has("to") && (params.get("to") ?? "") !== "";
  const fromDate = new Date(today);
  fromDate.setFullYear(today.getFullYear() - 1);
  const from = hasFrom
    ? (parseOptionalDateQuery(params.get("from"), "from date") ?? "")
    : toYyyyMmDd(fromDate);
  const to = hasTo ? (parseOptionalDateQuery(params.get("to"), "to date") ?? "") : toYyyyMmDd(today);
  if (from && to && from > to) {
    throw new ApiHttpError(400, "Please enter a from date on or before the to date.");
  }
  return { from, to, hideWarmups };
}

function periodName(range: InsightsRange, from: string, to: string, today: Date): string | null {
  if (!from || !to) {
    return null;
  }
  const preset = getInsightsPresetRange(range, today);
  if (from !== preset.from || to !== preset.to) {
    return null;
  }
  if (range === "4w") {
    return "4 weeks";
  }
  if (range === "12w") {
    return "12 weeks";
  }
  if (range === "6m") {
    return "6 months";
  }
  return null;
}

function filterActivity(
  points: WorkoutActivityPoint[],
  range: InsightsRange,
  from: string,
  to: string,
): WorkoutActivityPoint[] {
  return applyInsightsRange(points, range).filter((point) => {
    if (from && point.date < from) {
      return false;
    }
    if (to && point.date > to) {
      return false;
    }
    return true;
  });
}

function filterWeekly(
  weekly: WeeklyVolumePoint[],
  range: InsightsRange,
  from: string,
  to: string,
): WeeklyVolumePoint[] {
  const asDaily = weekly.map((item) => ({
    date: item.weekStart,
    workouts: item.sessionCount,
    sets: item.workingSets,
    loadedKg: item.volumeKg,
  }));
  const rangedDates = new Set(filterActivity(asDaily, range, from, to).map((item) => item.date));
  return weekly.filter((item) => rangedDates.has(item.weekStart));
}

function withMovingAverage(weekly: WeeklyVolumePoint[]) {
  return weekly.map((item, index) => {
    if (index < 3) {
      return { ...item, movingAverageVolumeKg: null, movingAverageWorkingSets: null };
    }
    const window = weekly.slice(index - 3, index + 1);
    const volume = window.reduce((sum, row) => sum + row.volumeKg, 0) / window.length;
    const sets = window.reduce((sum, row) => sum + row.workingSets, 0) / window.length;
    return {
      ...item,
      movingAverageVolumeKg: Number(volume.toFixed(2)),
      movingAverageWorkingSets: Number(sets.toFixed(2)),
    };
  });
}

function lifterProfile(profile: UserStrengthProfile, today: Date): LifterProfile {
  const age = resolveLifterAge({
    dateOfBirth: profile.dateOfBirth,
    birthYear: profile.birthYear,
    today,
  });
  return {
    sex: profile.sex,
    bodyweightKg: profile.bodyweightKg,
    bodyweightEntries: profile.bodyweightEntries,
    ageYears: age?.ageYears ?? null,
    ageIsApproximate: age?.ageIsApproximate ?? false,
  };
}

export function buildInsightsPayload(input: {
  query: InsightsQuery;
  today: Date;
  history: InsightsHistory;
  profile: UserStrengthProfile;
}) {
  const { query, today, history, profile } = input;
  const activity = filterActivity(history.activity, query.range, query.from, query.to);
  const weekly = withMovingAverage(filterWeekly(history.weekly, query.range, query.from, query.to));
  const totals = activity.reduce(
    (sum, item) => ({
      workouts: sum.workouts + item.workouts,
      sets: sum.sets + item.sets,
      volumeKg: sum.volumeKg + item.loadedKg,
    }),
    { workouts: 0, sets: 0, volumeKg: 0 },
  );
  const name = periodName(query.range, query.from, query.to, today);
  const progress = buildExerciseProgressReport(
    history.exerciseSets,
    { from: query.from, to: query.to },
    lifterProfile(profile, today),
  );
  return {
    range: query.range,
    from: query.from,
    to: query.to,
    totals: {
      workouts: totals.workouts,
      sets: totals.sets,
      volume_kg: totals.volumeKg,
      working_sets: weekly.reduce((sum, item) => sum + item.workingSets, 0),
    },
    weekly: weekly.map((item) => ({
      week_start: item.weekStart,
      volume_kg: item.volumeKg,
      working_sets: item.workingSets,
      session_count: item.sessionCount,
      moving_average_volume_kg: item.movingAverageVolumeKg,
      moving_average_working_sets: item.movingAverageWorkingSets,
    })),
    comparison: {
      volume: buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: weekly,
        allWeeks: history.weekly,
        dateFrom: query.from,
        dateTo: query.to,
        periodName: name,
      }),
      working_sets: buildInsightsComparisonSentence({
        metric: "workingSets",
        currentWeeks: weekly,
        allWeeks: history.weekly,
        dateFrom: query.from,
        dateTo: query.to,
        periodName: name,
      }),
    },
    summary: progress.summary,
    exercises: progress.rows.map((row) => ({
      exercise_id: row.exerciseId,
      slug: row.slug,
      label: row.label,
      session_count: row.sessionCount,
      latest_e1rm_kg: row.latestE1rmKg,
      best_e1rm_kg: row.bestE1rmKg,
      best_performed_on: row.bestPerformedOn,
      change_kg: row.changeKg,
      read: row.read,
      detail: row.detail,
    })),
    lift_comparison: [...progress.publicNotes, ...progress.balanceNotes].map((note) => ({
      id: note.id,
      title: note.title,
      badge: note.badge,
      kind: note.kind,
      detail: note.detail,
    })),
  };
}
