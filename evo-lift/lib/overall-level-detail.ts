import { bodyweightOnOrBefore, type BodyweightLogEntry } from "@/lib/bodyweight-log";
import type { ExerciseWorkingSetSample } from "@/lib/insights-data";
import {
  classifyExrxLift,
  EXRX_AGE_BAND,
  EXRX_LEVELS,
  exrxLevelFromAverage,
  exrxLevelScore,
  isPublicStandardLift,
  type ExrxLevel,
} from "@/lib/strength-standards";

/** A main lift counts toward a firm overall level only inside this window. */
export const OVERALL_LEVEL_RECENT_DAYS = 56;
export const OVERALL_LEVEL_MIN_RECENT_LIFTS = 3;

const MAIN_LIFT_ORDER = ["back-squat", "barbell-bench-press", "deadlift", "overhead-press"] as const;

export type OverallLevelProgress = {
  /** 0–1 from the start of this level to the next. 1 at Elite. Null when provisional. */
  fraction: number | null;
  nextLabel: string | null;
};

export type OverallLevelInfluence = "pulls-up" | "holds-back" | "matches" | "left-out";

export type OverallLevelLift = {
  slug: string;
  label: string;
  level: string;
  /** Null when the lift is recent but the overall level is still provisional. */
  influence: OverallLevelInfluence | null;
};

export type OverallLevelHistoryPoint = {
  asOf: string;
  badge: string;
};

/** Fill from the bottom of the band that rounds to `badge` up to the next band. */
export function overallLevelProgress(average: number, badge: ExrxLevel): OverallLevelProgress {
  const score = exrxLevelScore(badge);
  const next = EXRX_LEVELS[score + 1] ?? null;
  if (next == null) {
    return { fraction: 1, nextLabel: null };
  }
  const spanStart = score === 0 ? 0 : score - 0.5;
  const span = score === 0 ? 0.5 : 1;
  const fraction = Math.min(1, Math.max(0, (average - spanStart) / span));
  return { fraction, nextLabel: next };
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

/**
 * How the percent is placed between this level and the next, and which counted lifts are still below the next level.
 * Null at Elite and while the overall level is provisional.
 */
export function overallLevelProgressNote(level: {
  badge: string;
  progress: OverallLevelProgress;
  lifts: readonly OverallLevelLift[];
}): string | null {
  const nextLabel = level.progress.nextLabel;
  if (level.progress.fraction == null || nextLabel == null || !isExrxLevel(nextLabel)) {
    return null;
  }
  const counting = level.lifts.filter((lift) => lift.influence != null && lift.influence !== "left-out");
  const nextScore = exrxLevelScore(nextLabel);
  const short = counting.filter((lift) => {
    const score = isExrxLevel(lift.level) ? exrxLevelScore(lift.level) : null;
    return score != null && score < nextScore;
  });
  const leftOut = level.lifts.filter((lift) => lift.influence === "left-out");
  const counted = counting.length;
  const liftsWord = counted === 1 ? "lift" : "lifts";
  const how =
    counted > 0
      ? `The percent is how far the average of ${counted} recent main ${liftsWord} sits from ${level.badge} toward ${nextLabel}. Each lift counts the same.`
      : `The percent is how far the average of your recent main lifts sits from ${level.badge} toward ${nextLabel}.`;
  const leftOutSentence =
    leftOut.length === 0
      ? null
      : leftOut.length === 1
        ? `${joinLabels(leftOut.map((lift) => lift.label))} is outside the last 8 weeks, so it is left out.`
        : `${joinLabels(leftOut.map((lift) => lift.label))} are outside the last 8 weeks, so they are left out.`;
  const shortSentence =
    short.length === 0
      ? null
      : `${joinLabels(short.map((lift) => lift.label))} ${short.length === 1 ? "is" : "are"} still short of ${nextLabel}.`;
  return [how, leftOutSentence, shortSentence].filter(Boolean).join(" ");
}

export function overallLevelInfluence(liftScore: number, overallScore: number): Exclude<OverallLevelInfluence, "left-out"> {
  if (liftScore > overallScore) {
    return "pulls-up";
  }
  if (liftScore < overallScore) {
    return "holds-back";
  }
  return "matches";
}

/**
 * Extra note on a main-lift row.
 * The level name already shows whether the lift sits above, below, or with the overall level.
 * A left-out lift still has a level, so the row has to say it does not count.
 */
export function overallLevelInfluenceLabel(influence: OverallLevelInfluence): string | null {
  if (influence === "left-out") {
    return "Outside the last 8 weeks";
  }
  return null;
}

export function overallLevelSource(sex: "female" | "male"): string {
  const who = sex === "female" ? "women" : "men";
  return `ExRx.net standards for ${who}, ages ${EXRX_AGE_BAND}.`;
}

/** A higher ExRx level than the one before this session. Provisional is not a reached level. */
export function overallLevelUpMessage(beforeBadge: string | null, afterBadge: string | null): string | null {
  if (afterBadge == null || !isExrxLevel(afterBadge)) {
    return null;
  }
  const afterScore = exrxLevelScore(afterBadge);
  if (beforeBadge == null || beforeBadge === "Provisional") {
    return `You reached ${afterBadge}.`;
  }
  if (!isExrxLevel(beforeBadge) || exrxLevelScore(beforeBadge) >= afterScore) {
    return null;
  }
  return `You reached ${afterBadge}.`;
}

function isExrxLevel(badge: string): badge is ExrxLevel {
  return (EXRX_LEVELS as readonly string[]).includes(badge);
}

function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type MainPeak = {
  performedOn: string;
  e1rmKg: number;
  label: string;
};

function sessionPeaks(samples: readonly ExerciseWorkingSetSample[]): MainPeak[] {
  const bySession = new Map<string, MainPeak>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.totalKg) || sample.totalKg <= 0 || sample.reps < 1 || sample.reps > 12) {
      continue;
    }
    const e1rmKg = sample.reps === 1 ? sample.totalKg : sample.totalKg * (1 + sample.reps / 30);
    const current = bySession.get(sample.sessionId);
    if (!current || e1rmKg > current.e1rmKg) {
      bySession.set(sample.sessionId, {
        performedOn: sample.performedOn,
        e1rmKg,
        label: sample.label,
      });
    }
  }
  return [...bySession.values()].sort((left, right) => left.performedOn.localeCompare(right.performedOn));
}

function bestAsOf(peaks: readonly MainPeak[], asOf: string): MainPeak | null {
  let best: MainPeak | null = null;
  for (const peak of peaks) {
    if (peak.performedOn > asOf) {
      break;
    }
    if (!best || peak.e1rmKg > best.e1rmKg) {
      best = peak;
    }
  }
  return best;
}

function bodyweightKgFor(
  entries: readonly BodyweightLogEntry[],
  fallbackKg: number | null,
  performedOn: string,
): number | null {
  if (entries.length > 0) {
    return bodyweightOnOrBefore(entries, performedOn);
  }
  return fallbackKg != null && fallbackKg > 0 ? fallbackKg : null;
}

function badgeOnDate(
  peaksBySlug: ReadonlyMap<string, MainPeak[]>,
  sex: "female" | "male",
  bodyweightEntries: readonly BodyweightLogEntry[],
  fallbackKg: number | null,
  asOf: string,
): string | null {
  const cutoff = shiftIsoDate(asOf, -OVERALL_LEVEL_RECENT_DAYS);
  let recentCount = 0;
  let scoreSum = 0;
  for (const slug of MAIN_LIFT_ORDER) {
    const best = bestAsOf(peaksBySlug.get(slug) ?? [], asOf);
    if (best == null || best.performedOn < cutoff) {
      continue;
    }
    const bodyweightKg = bodyweightKgFor(bodyweightEntries, fallbackKg, best.performedOn);
    if (bodyweightKg == null) {
      continue;
    }
    const level = classifyExrxLift(slug, best.e1rmKg, sex, bodyweightKg);
    if (level == null) {
      continue;
    }
    recentCount += 1;
    scoreSum += exrxLevelScore(level);
  }
  if (recentCount === 0) {
    return null;
  }
  if (recentCount < OVERALL_LEVEL_MIN_RECENT_LIFTS) {
    return "Provisional";
  }
  return exrxLevelFromAverage(scoreSum / recentCount);
}

/** Badge changes across main-lift session days, ending at `asOf`. */
export function overallLevelHistory(input: {
  samples: readonly ExerciseWorkingSetSample[];
  sex: "female" | "male";
  bodyweightKg: number | null;
  bodyweightEntries: readonly BodyweightLogEntry[];
  asOf: string;
}): OverallLevelHistoryPoint[] {
  const peaksBySlug = new Map<string, ExerciseWorkingSetSample[]>();
  for (const sample of input.samples) {
    if (!isPublicStandardLift(sample.slug) || sample.performedOn > input.asOf) {
      continue;
    }
    const list = peaksBySlug.get(sample.slug) ?? [];
    list.push(sample);
    peaksBySlug.set(sample.slug, list);
  }
  const peaks = new Map<string, MainPeak[]>();
  const dates = new Set<string>();
  for (const [slug, samples] of peaksBySlug) {
    const slugPeaks = sessionPeaks(samples);
    peaks.set(slug, slugPeaks);
    for (const peak of slugPeaks) {
      dates.add(peak.performedOn);
    }
  }
  dates.add(input.asOf);
  const points: OverallLevelHistoryPoint[] = [];
  for (const asOf of [...dates].sort()) {
    const badge = badgeOnDate(peaks, input.sex, input.bodyweightEntries, input.bodyweightKg, asOf);
    if (badge == null || points[points.length - 1]?.badge === badge) {
      continue;
    }
    points.push({ asOf, badge });
  }
  return points;
}
