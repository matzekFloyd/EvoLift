import { isFutureSessionDate } from "@/lib/session-date";

type CachedHomeSession = {
  performedOn: string;
  slugs: string[];
};

const sessionsByUserId = new Map<string, CachedHomeSession[]>();

/** Remember the home summary so the exercise list can reuse it in this browser session. */
export function rememberHomeSessionSummaries(
  userId: string,
  rows: Array<{
    performed_on: string;
    exercise_badges: Array<{ slug: string }> | null;
  }>,
) {
  sessionsByUserId.set(
    userId,
    rows.map((row) => ({
      performedOn: row.performed_on,
      slugs: (row.exercise_badges ?? [])
        .map((badge) => badge.slug)
        .filter((slug) => typeof slug === "string" && slug.length > 0),
    })),
  );
}

/** Session counts by exercise slug, excluding planned sessions. Null when Home has not loaded. */
export function pastSessionCountsBySlug(userId: string): Map<string, number> | null {
  const rows = sessionsByUserId.get(userId);
  if (!rows) {
    return null;
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (isFutureSessionDate(row.performedOn)) {
      continue;
    }
    for (const slug of row.slugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}
