import type { SessionSetDraft } from "./session-set-draft";

/** Browser-wide. Not tied to one session. */
export const ONE_VALUE_LOGGING_STORAGE_KEY = "evolift.one-value-logging";

export const LOADED_WEIGHT_INVALID = "Please enter a valid loaded weight.";
export const REPS_INVALID = "Please enter a valid reps value.";
export const TARGET_SETS_LOGGED = "Target sets logged.";

export type OneValueScreen = "load" | "reps";

export type OneValueStep = {
  screen: OneValueScreen;
  weightKg: string;
  reps: string;
  isWarmup: boolean;
};

export type OneValuePresence =
  | { status: "entry"; step: OneValueStep }
  | { status: "left" }
  | { status: "paused"; reason: "target-met" | "open" };

export type OneValuePrimaryAction = "next" | "save" | "add-another" | "add-set";

export function oneValueLoggingEnabledFromStorage(value: string | null): boolean {
  return value === "1";
}

export function freshLoadStep(draft: SessionSetDraft): OneValueStep {
  return {
    screen: "load",
    weightKg: draft.weightKg,
    reps: draft.reps,
    isWarmup: false,
  };
}

/** Missing state opens Loaded (kg). A stored step, including one left unfinished, stays as it is. */
export function visibleOneValuePresence(
  stored: OneValuePresence | undefined,
  prefill: SessionSetDraft,
): OneValuePresence {
  if (!stored) {
    return { status: "entry", step: freshLoadStep(prefill) };
  }
  return stored;
}

/** Next exercise restores an in-progress step. Otherwise it opens Loaded (kg). */
export function presenceForNextExercise(
  stored: OneValuePresence | undefined,
  prefill: SessionSetDraft,
): OneValuePresence {
  if (stored?.status === "entry") {
    return stored;
  }
  return { status: "entry", step: freshLoadStep(prefill) };
}

export function parseOneValueLoad(
  weightKg: string,
): { ok: false; message: string } | { ok: true; weightKg: number | null } {
  const trimmed = weightKg.trim();
  if (!trimmed) {
    return { ok: true, weightKg: null };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false, message: LOADED_WEIGHT_INVALID };
  }
  return { ok: true, weightKg: parsed };
}

export function parseOneValueReps(
  reps: string,
): { ok: false; message: string } | { ok: true; reps: number } {
  const parsed = Number(reps);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, message: REPS_INVALID };
  }
  return { ok: true, reps: parsed };
}

/** Next checks the load and moves to reps. It does not write a set. */
export function goToReps(
  step: OneValueStep,
): { ok: false; message: string } | { ok: true; step: OneValueStep } {
  const load = parseOneValueLoad(step.weightKg);
  if (!load.ok) {
    return load;
  }
  return {
    ok: true,
    step: {
      ...step,
      weightKg: load.weightKg == null ? "" : String(load.weightKg),
      screen: "reps",
    },
  };
}

/** Back from reps keeps both values and the warmup choice. */
export function backToLoad(step: OneValueStep): OneValueStep {
  return { ...step, screen: "load" };
}

export function stepLoadedWeight(current: string, delta: number): string {
  const next = Number((Number(current || "0") + delta).toFixed(1));
  return String(Math.max(0, next));
}

export function stepReps(current: string, delta: number): string {
  if (delta < 0) {
    return String(Math.max(1, Number(current || "1") + delta));
  }
  return String(Math.max(1, Number(current || "0") + delta));
}

export function nextWorkingSetNumber(workingSetCount: number): number {
  return workingSetCount + 1;
}

export function oneValueContextLine(input: {
  exerciseName: string;
  screen: OneValueScreen;
  workingSetNumber: number;
  targetWorkingSets: number | null;
  isWarmup: boolean;
}): string {
  const field = input.screen === "load" ? "Loaded (kg)" : "Reps";
  const kind = input.isWarmup
    ? "Warmup"
    : input.targetWorkingSets != null && input.targetWorkingSets > 0
      ? `Working set ${input.workingSetNumber} of ${input.targetWorkingSets}`
      : `Working set ${input.workingSetNumber}`;
  return `${input.exerciseName} · ${kind} · ${field}`;
}

export function lastSetSummary(
  set: { weight_kg: number | null; reps: number } | null,
): string | null {
  if (!set) {
    return null;
  }
  return `Last set: ${set.weight_kg ?? 0} kg × ${set.reps} reps`;
}

/**
 * Working sets only. Under the target, open the next Loaded (kg) screen.
 * At the target, or when no target is set, stop.
 */
export function advanceAfterSavedSet(input: {
  workingSetCount: number;
  targetWorkingSets: number | null;
}): "next-load" | "target-met" | "open" {
  const target = input.targetWorkingSets;
  const hasTarget = target != null && target > 0;
  if (hasTarget && input.workingSetCount < target) {
    return "next-load";
  }
  if (hasTarget) {
    return "target-met";
  }
  return "open";
}

export function oneValuePrimaryAction(presence: OneValuePresence): OneValuePrimaryAction {
  if (presence.status === "left") {
    return "add-set";
  }
  if (presence.status === "paused") {
    return "add-another";
  }
  return presence.step.screen === "load" ? "next" : "save";
}

export function oneValuePrimaryLabel(action: OneValuePrimaryAction): string {
  switch (action) {
    case "next":
      return "Next";
    case "save":
      return "Save set";
    case "add-another":
      return "Add another set";
    case "add-set":
      return "Add set";
  }
}
