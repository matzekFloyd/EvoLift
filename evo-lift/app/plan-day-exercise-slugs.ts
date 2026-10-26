type PlanDayExerciseSlugRow = {
  position: number;
  exercises: { slug: string } | { slug: string }[] | null;
};

/** Planned exercise slugs for a day, in plan order. Logged-session chips stay separate. */
export function planDayExerciseSlugs(
  exercises: readonly PlanDayExerciseSlugRow[] | null | undefined,
): string[] {
  return [...(exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((row) => {
      const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
      const slug = exercise?.slug.trim() ?? "";
      return slug ? [slug] : [];
    });
}
