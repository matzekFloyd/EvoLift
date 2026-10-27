/**
 * Load the lifter moved on an assisted set: bodyweight minus assistance.
 * Null when there is no bodyweight, or assistance is greater than that bodyweight.
 * 0 kg assistance is the full bodyweight.
 */
export function assistedMovedLoadKg(
  bodyweightKg: number | null,
  assistanceKg: number,
): number | null {
  if (bodyweightKg == null || !(bodyweightKg > 0) || !Number.isFinite(assistanceKg) || assistanceKg < 0) {
    return null;
  }
  if (assistanceKg > bodyweightKg) {
    return null;
  }
  return bodyweightKg - assistanceKg;
}
