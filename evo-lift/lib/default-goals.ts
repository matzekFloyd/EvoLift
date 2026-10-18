/**
 * Starter bodyweight goals for new accounts.
 *
 * ExRx.net publishes 1RM standards by sex, bodyweight class, and level
 * (Untrained → Elite), not fixed bodyweight multiples or “default goals.”
 * These multiples are rounded coaching targets for the four ExRx barbell lifts,
 * near typical Intermediate ratios for a mid-bodyweight adult male, and work
 * before the lifter has logged bodyweight or sex.
 *
 * @see https://exrx.net/Testing/WeightLifting/StrengthStandards
 */
export type DefaultGoalSeed = {
  slug: string;
  bodyweightMultiple: number;
  minReps: number;
};

export const DEFAULT_GOAL_SEEDS: readonly DefaultGoalSeed[] = [
  { slug: "back-squat", bodyweightMultiple: 1.5, minReps: 1 },
  { slug: "barbell-bench-press", bodyweightMultiple: 1.0, minReps: 1 },
  { slug: "deadlift", bodyweightMultiple: 2.0, minReps: 1 },
  { slug: "overhead-press", bodyweightMultiple: 0.75, minReps: 1 },
] as const;
