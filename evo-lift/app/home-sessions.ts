export type HomeExerciseBadge = {
  slug: string;
  hasLoggedSet: boolean;
};

export function homeSetCount(value: unknown): number {
  const setCount = Number(value);
  return Number.isFinite(setCount) ? setCount : 0;
}

export function homeExerciseBadges(
  value: Array<{ slug?: unknown; has_logged_set?: unknown }> | null,
): HomeExerciseBadge[] {
  const badges = Array.isArray(value) ? value : [];
  return badges
    .filter((badge) => typeof badge.slug === "string" && badge.slug.length > 0)
    .map((badge) => ({
      slug: badge.slug as string,
      hasLoggedSet: badge.has_logged_set === true,
    }));
}
