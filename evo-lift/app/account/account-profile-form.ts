import { ageFromDateOfBirth, approximateAge } from "@/lib/body-metrics";
import { isCompoundExercise } from "@/lib/compound-exercise";
import type { Database } from "@/lib/supabase/database.types";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";

type ExerciseDefaultsRow = Database["public"]["Tables"]["user_exercise_defaults"]["Row"];

export type DoubleProgressionChoice = "account" | "yes" | "no";

export type ExerciseDefaultsFormValues = {
  baseWeightKg: string;
  targetSets: string;
  targetReps: string;
  targetWeightKg: string;
  suggestWarmups: boolean;
  suggestTarget: boolean;
  doubleProgression: DoubleProgressionChoice;
  maxWarmupSets: string;
};

/** Saved null follows the account switch. */
export function doubleProgressionChoice(
  value: boolean | null | undefined,
): DoubleProgressionChoice {
  if (value === true) {
    return "yes";
  }
  if (value === false) {
    return "no";
  }
  return "account";
}

/** Form choice written to user_exercise_defaults.double_progression. */
export function doubleProgressionOverride(choice: DoubleProgressionChoice): boolean | null {
  if (choice === "yes") {
    return true;
  }
  if (choice === "no") {
    return false;
  }
  return null;
}

/** Local calendar date as YYYY-MM-DD. */
export function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

/** Exact age from a date of birth, else an approximate age from the year on file. */
export function accountAgeDisplay(input: {
  dateOfBirth: string;
  birthYearFallback: number | null;
  now: Date;
}): { exactAge: number | null; yearOnlyAge: number | null } {
  const exactAge =
    input.dateOfBirth.trim() === "" ? null : ageFromDateOfBirth(input.dateOfBirth.trim(), input.now);
  const yearOnlyAge =
    exactAge == null && input.birthYearFallback != null
      ? approximateAge(input.birthYearFallback, input.now.getFullYear())
      : null;
  return { exactAge, yearOnlyAge };
}

/** Form field values for the selected exercise. Empty strings when nothing is saved. */
export function exerciseDefaultsFormValues(input: {
  saved: ExerciseDefaultsRow | undefined;
  exerciseId: string;
  slug: string | undefined;
}): ExerciseDefaultsFormValues {
  const { saved } = input;
  return {
    baseWeightKg: saved?.default_base_weight_kg == null ? "" : String(saved.default_base_weight_kg),
    targetSets: saved?.default_target_sets == null ? "" : String(saved.default_target_sets),
    targetReps: saved?.default_target_reps == null ? "" : String(saved.default_target_reps),
    targetWeightKg:
      saved?.default_target_weight_kg == null ? "" : String(saved.default_target_weight_kg),
    suggestWarmups: input.exerciseId
      ? warmupSuggestionsEnabled(saved?.suggest_warmups, isCompoundExercise(input.slug))
      : true,
    suggestTarget: saved?.suggest_target !== false,
    doubleProgression: doubleProgressionChoice(saved?.double_progression),
    maxWarmupSets:
      saved?.max_suggested_warmup_sets == null ? "" : String(saved.max_suggested_warmup_sets),
  };
}
