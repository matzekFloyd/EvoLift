/** Default weeks with no higher estimated 1RM before Insights flags a main lift. */
export const DEFAULT_MAIN_LIFT_STAGNATION_WEEKS = 6;

export const MIN_MAIN_LIFT_STAGNATION_WEEKS = 1;
export const MAX_MAIN_LIFT_STAGNATION_WEEKS = 52;

export const MAIN_LIFT_STAGNATION_WEEKS_KEY = "evolift-main-lift-stagnation-weeks";

export type MainLiftStagnationPoint = {
  performedOn: string;
  e1rmKg: number;
};

export type MainLiftStagnationSeries = {
  slug: string;
  shortLabel: string;
  points: readonly MainLiftStagnationPoint[];
};

export type StagnantMainLift = {
  slug: string;
  shortLabel: string;
  /** Whole weeks from the session that first hit the best estimate to the latest session. */
  weeksSinceBest: number;
};

function roundedTenth(kg: number): number {
  return Math.round(kg * 10) / 10;
}

function utcDayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
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
 * A whole number of weeks from 1 to 52. Anything else is not a saved setting.
 */
export function parseMainLiftStagnationWeeks(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const weeks = Number(trimmed);
  if (weeks < MIN_MAIN_LIFT_STAGNATION_WEEKS || weeks > MAX_MAIN_LIFT_STAGNATION_WEEKS) {
    return null;
  }
  return weeks;
}

/** Saved weeks, or the default when nothing valid is stored. */
export function mainLiftStagnationWeeksOrDefault(raw: string | null): number {
  if (raw == null) {
    return DEFAULT_MAIN_LIFT_STAGNATION_WEEKS;
  }
  return parseMainLiftStagnationWeeks(raw) ?? DEFAULT_MAIN_LIFT_STAGNATION_WEEKS;
}

/**
 * Main lifts whose best estimated 1RM, to 0.1 kg, was first hit at least `weeks`
 * before the latest session and has not been beaten since.
 * One session, or a higher estimate on a later session, is not a stall.
 */
export function stagnantMainLifts(
  series: readonly MainLiftStagnationSeries[],
  weeks: number,
): StagnantMainLift[] {
  if (!Number.isInteger(weeks) || weeks < MIN_MAIN_LIFT_STAGNATION_WEEKS) {
    return [];
  }
  const stalled: StagnantMainLift[] = [];
  for (const lift of series) {
    const points = [...lift.points].sort((left, right) => left.performedOn.localeCompare(right.performedOn));
    if (points.length < 2) {
      continue;
    }
    let bestTenth = Number.NEGATIVE_INFINITY;
    let bestOn = points[0].performedOn;
    for (const point of points) {
      const tenth = roundedTenth(point.e1rmKg);
      if (tenth > bestTenth) {
        bestTenth = tenth;
        bestOn = point.performedOn;
      }
    }
    const latest = points[points.length - 1];
    const days = utcDayNumber(latest.performedOn) - utcDayNumber(bestOn);
    const weeksSinceBest = Math.floor(days / 7);
    if (weeksSinceBest >= weeks) {
      stalled.push({ slug: lift.slug, shortLabel: lift.shortLabel, weeksSinceBest });
    }
  }
  return stalled;
}

/** Warning copy for the lifts that are stalled. Null when none are. */
export function mainLiftStagnationMessage(lifts: readonly Pick<StagnantMainLift, "shortLabel">[], weeks: number): string | null {
  if (lifts.length === 0 || !Number.isInteger(weeks) || weeks < 1) {
    return null;
  }
  const names = joinLabels(lifts.map((lift) => lift.shortLabel));
  const verb = lifts.length === 1 ? "has" : "have";
  const weekWord = weeks === 1 ? "week" : "weeks";
  return `${names} estimated 1RM ${verb} not improved for ${weeks} ${weekWord}.`;
}
