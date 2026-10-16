export type HomeExerciseBadgeTone = "default" | "sessionLogged" | "skipped";

export type HomeExerciseBadge = {
  slug: string;
  hasLoggedSet: boolean;
  skipped: boolean;
};

export function homeExerciseBadgeTone(badge: {
  hasLoggedSet: boolean;
  skipped: boolean;
}): HomeExerciseBadgeTone {
  if (badge.skipped) {
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

export function homeExerciseBadges(
  value: Array<{ slug?: unknown; has_logged_set?: unknown; not_done?: unknown }> | null,
): HomeExerciseBadge[] {
  const badges = Array.isArray(value) ? value : [];
  return badges
    .filter((badge) => typeof badge.slug === "string" && badge.slug.length > 0)
    .map((badge) => ({
      slug: badge.slug as string,
      hasLoggedSet: badge.has_logged_set === true,
      skipped: badge.not_done === true,
    }));
}
