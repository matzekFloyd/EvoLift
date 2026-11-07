/** Exercises where the load moved is bodyweight plus the added load. Dip only. */
const BODYWEIGHT_PLUS_LOAD_SLUGS = new Set(["dip"]);

export function isBodyweightPlusLoadExercise(slug: string | null | undefined): boolean {
  return slug != null && BODYWEIGHT_PLUS_LOAD_SLUGS.has(slug);
}

/**
 * Added load on Dip. A blank weight is 0 kg added. A negative number is not a load.
 */
export function dipAddedLoadKg(weightKg: number | null): number | null {
  if (weightKg == null) {
    return 0;
  }
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight < 0) {
    return null;
  }
  return weight;
}

/**
 * Load moved on a dip: bodyweight plus added load.
 * Null when there is no bodyweight. 0 kg added is the full bodyweight.
 */
export function bodyweightPlusAddedLoadKg(
  bodyweightKg: number | null,
  addedKg: number,
): number | null {
  if (bodyweightKg == null || !(bodyweightKg > 0) || !Number.isFinite(addedKg) || addedKg < 0) {
    return null;
  }
  return bodyweightKg + addedKg;
}
