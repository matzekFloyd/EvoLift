export type HomeExerciseBadgeTone = "default" | "sessionLogged" | "skipped";

export type HomeExerciseBadge = {
  slug: string;
  hasLoggedSet: boolean;
  skipped: boolean;
  /** Finished session logged fewer working sets than its target. Warmups are already excluded. */
  setsShort: boolean;
  label: string;
};

type HomeExerciseBadgeInput = {
  slug?: unknown;
  has_logged_set?: unknown;
  not_done?: unknown;
  working_set_count?: unknown;
  target_sets?: unknown;
};

export function homeExerciseSetsShort(input: {
  completed: boolean;
  skipped: boolean;
  targetSets: number | null;
  workingSetCount: number;
}): boolean {
  if (!input.completed || input.skipped) {
    return false;
  }
  if (input.targetSets == null) {
    return false;
  }
  return input.workingSetCount < input.targetSets;
}

export function homeExerciseBadgeLabel(input: {
  slug: string;
  skipped: boolean;
  setsShort: boolean;
  workingSetCount: number;
  targetSets: number | null;
}): string {
  if (input.skipped) {
    return `${input.slug}, skipped`;
  }
  if (input.setsShort && input.targetSets != null) {
    return `${input.slug}, ${input.workingSetCount} of ${input.targetSets} sets`;
  }
  return input.slug;
}

export function homeExerciseBadgeTone(badge: {
  hasLoggedSet: boolean;
  skipped: boolean;
  setsShort?: boolean;
}): HomeExerciseBadgeTone {
  if (badge.skipped || badge.setsShort) {
    return "skipped";
  }
  if (badge.hasLoggedSet) {
    return "sessionLogged";
  }
  return "default";
}

export function homeSetCount(value: unknown): number {
  const setCount = Number(value);
  return Number.isFinite(setCount) ? setCount : 0;
}

function nonNegativeCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.trunc(parsed);
}

function targetSetCount(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}

export function homeExerciseBadges(
  value: HomeExerciseBadgeInput[] | null,
  options?: { completed?: boolean },
): HomeExerciseBadge[] {
  const badges = Array.isArray(value) ? value : [];
  const completed = options?.completed === true;
  return badges
    .filter((badge) => typeof badge.slug === "string" && badge.slug.length > 0)
    .map((badge) => {
      const slug = badge.slug as string;
      const skipped = badge.not_done === true;
      const workingSetCount = nonNegativeCount(badge.working_set_count);
      const targetSets = targetSetCount(badge.target_sets);
      const setsShort = homeExerciseSetsShort({
        completed,
        skipped,
        targetSets,
        workingSetCount,
      });
      return {
        slug,
        hasLoggedSet: badge.has_logged_set === true,
        skipped,
        setsShort,
        label: homeExerciseBadgeLabel({
          slug,
          skipped,
          setsShort,
          workingSetCount,
          targetSets,
        }),
      };
    });
}
