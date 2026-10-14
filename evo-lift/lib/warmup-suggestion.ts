import { formatKgAmount, formatRepCount } from "@/lib/milestone-progress";

/** Nearest plate the warmup ladder uses. */
const INCREMENT_KG = 2.5;
const NEAR_TARGET_CENTS = 250;

export const WARMUP_TARGET_MISSING_MESSAGE = "Set a target weight to suggest warmups.";
export const WARMUP_SUGGESTION_NOTE = "Suggestion only. You can edit each set after adding.";

export type WarmupStep = {
  loadedKg: number;
  reps: number;
};

export type WarmupSuggestion =
  | { status: "message"; message: string }
  | { status: "steps"; steps: WarmupStep[] };

export type WarmupSuggestionInput = {
  targetWeightKg: number | null;
  /**
   * Bar weight stored on the exercise.
   * It is not a warmup step, and it is not subtracted from the target.
   */
  baseWeightKg?: number | null;
};

type RatioStep = {
  ratio: number;
  reps: number;
};

function cents(value: number): number {
  return Math.round(value * 100);
}

/** Snap Loaded (kg) to the nearest 2.5 kg. Halfway values round away from zero. */
export function roundToNearest2_5Kg(value: number): number {
  const steps = Math.round(value / INCREMENT_KG);
  return Math.round(steps * NEAR_TARGET_CENTS) / 100;
}

/**
 * Round each load, then drop a step that is 0 kg or below, a duplicate,
 * within 2.5 kg of the target, or at or above the target.
 * Remaining steps stay in ascending load order. The first of a duplicate pair is kept.
 */
export function filterWarmupSteps(
  steps: Array<{ loadKg: number; reps: number }>,
  targetWeightKg: number,
): WarmupStep[] {
  const targetCents = cents(targetWeightKg);
  const kept: WarmupStep[] = [];
  const seen = new Set<number>();

  for (const step of steps) {
    if (!Number.isFinite(step.loadKg)) {
      continue;
    }
    const loadedKg = roundToNearest2_5Kg(step.loadKg);
    const loadedCents = cents(loadedKg);
    if (loadedCents <= 0) {
      continue;
    }
    if (loadedCents >= targetCents) {
      continue;
    }
    if (targetCents - loadedCents <= NEAR_TARGET_CENTS) {
      continue;
    }
    if (seen.has(loadedCents)) {
      continue;
    }
    seen.add(loadedCents);
    kept.push({ loadedKg, reps: step.reps });
  }

  kept.sort((left, right) => left.loadedKg - right.loadedKg);
  return kept;
}

function bandForTarget(targetWeightKg: number): RatioStep[] {
  if (targetWeightKg < 20) {
    return [{ ratio: 0.6, reps: 5 }];
  }
  if (targetWeightKg < 40) {
    return [
      { ratio: 0.5, reps: 5 },
      { ratio: 0.75, reps: 3 },
    ];
  }
  if (targetWeightKg < 80) {
    return [
      { ratio: 0.4, reps: 8 },
      { ratio: 0.6, reps: 5 },
      { ratio: 0.8, reps: 3 },
    ];
  }
  return [
    { ratio: 0.4, reps: 8 },
    { ratio: 0.55, reps: 5 },
    { ratio: 0.7, reps: 3 },
    { ratio: 0.85, reps: 2 },
  ];
}

/** Warmup ramp from Target weight (kg) alone. */
export function suggestWarmups(input: WarmupSuggestionInput): WarmupSuggestion {
  const targetWeightKg = input.targetWeightKg;
  if (targetWeightKg == null || !Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
    return { status: "message", message: WARMUP_TARGET_MISSING_MESSAGE };
  }

  const rawSteps = bandForTarget(targetWeightKg).map((step) => ({
    loadKg: targetWeightKg * step.ratio,
    reps: step.reps,
  }));

  return { status: "steps", steps: filterWarmupSteps(rawSteps, targetWeightKg) };
}

/** `20 kg × 8 reps` */
export function formatWarmupStep(step: WarmupStep): string {
  return `${formatKgAmount(step.loadedKg)} × ${formatRepCount(step.reps)}`;
}
