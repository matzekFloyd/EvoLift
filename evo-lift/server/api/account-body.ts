import {
  accountEmailUpdateError,
  accountPasswordUpdateError,
  exerciseDefaultsSaveError,
  normalizeAccountEmail,
} from "@/app/account/account-form";
import { validateBodyMetricsInput, type ParsedBodyMetrics } from "@/lib/body-metrics";
import {
  bodyweightLogEntryError,
  parseBodyweightKg,
} from "@/lib/bodyweight-log";
import { ApiHttpError, parseOptionalBoolean, requireUuid } from "@/server/api/http";

function requiredString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function metricField(value: unknown, message: string): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  throw new ApiHttpError(400, message);
}

export function parseEmailUpdate(body: Record<string, unknown>): {
  email: string;
  currentPassword: string;
} {
  const email = typeof body.email === "string" ? body.email : "";
  const emailError = accountEmailUpdateError(email);
  if (emailError) {
    throw new ApiHttpError(400, emailError);
  }
  const currentPassword = requiredString(body.current_password);
  if (!currentPassword) {
    throw new ApiHttpError(400, "Please enter your current password.");
  }
  return { email: normalizeAccountEmail(email), currentPassword };
}

export function parsePasswordUpdate(body: Record<string, unknown>, userEmail: string): {
  currentPassword: string;
  newPassword: string;
} {
  const currentPassword = requiredString(body.current_password);
  const newPassword = requiredString(body.new_password);
  const confirmNewPassword = requiredString(body.confirm_new_password);
  const message = accountPasswordUpdateError({
    userEmail,
    currentPassword,
    newPassword,
    confirmNewPassword,
  });
  if (message) {
    throw new ApiHttpError(400, message);
  }
  return { currentPassword, newPassword };
}

export function parseProfileBody(body: Record<string, unknown>, today: string): ParsedBodyMetrics {
  const fields = {
    bodyweightKg: metricField(body.bodyweight_kg, "Please enter a valid bodyweight."),
    heightCm: metricField(body.height_cm, "Please enter a valid height."),
    sex: body.sex == null ? "" : requiredString(body.sex),
    dateOfBirth: body.date_of_birth == null ? "" : requiredString(body.date_of_birth),
  };
  if (body.sex != null && typeof body.sex !== "string") {
    throw new ApiHttpError(400, "Please choose female or male, or leave sex unset.");
  }
  const parsed = validateBodyMetricsInput(fields, today);
  if (!parsed.ok) {
    throw new ApiHttpError(400, parsed.message);
  }
  return parsed.value;
}

export function parseBodyweightWrite(
  body: Record<string, unknown>,
  today: string,
  takenDates: readonly string[],
): { loggedOn: string; bodyweightKg: number } {
  const loggedOn = requiredString(body.logged_on);
  const weightText =
    typeof body.bodyweight_kg === "number" && Number.isFinite(body.bodyweight_kg)
      ? String(body.bodyweight_kg)
      : requiredString(body.bodyweight_kg);
  const message = bodyweightLogEntryError({
    bodyweightKg: weightText,
    loggedOn,
    today,
    takenDates,
  });
  if (message) {
    throw new ApiHttpError(400, message);
  }
  const bodyweightKg = parseBodyweightKg(weightText);
  if (bodyweightKg == null) {
    throw new ApiHttpError(400, "Please enter a valid bodyweight.");
  }
  return { loggedOn: loggedOn.trim().slice(0, 10), bodyweightKg };
}

export function parseHiddenExerciseIds(body: Record<string, unknown>): string[] {
  if (!Array.isArray(body.exercise_ids)) {
    throw new ApiHttpError(400, "Please select an exercise.");
  }
  const ids = body.exercise_ids.map((id) => {
    if (typeof id !== "string") {
      throw new ApiHttpError(400, "Please select an exercise.");
    }
    return requireUuid(id, "exercise id");
  });
  return [...new Set(ids)];
}

export type ParsedExerciseDefaults = {
  baseWeightKg: number | null;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  suggestWarmups: boolean;
  suggestTarget: boolean;
  maxWarmupSets: number | null;
  updateMaxWarmupSets: boolean;
};

function optionalMetric(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "nope";
}

export function parseExerciseDefaults(
  body: Record<string, unknown>,
  exerciseId: string,
): ParsedExerciseDefaults {
  const suggestWarmups = parseOptionalBoolean(body.suggest_warmups, "suggest_warmups");
  const suggestTarget = parseOptionalBoolean(body.suggest_target, "suggest_target");
  if (suggestWarmups === undefined || suggestTarget === undefined) {
    throw new ApiHttpError(400, "suggest_warmups and suggest_target must be booleans.");
  }
  const maxText =
    body.max_suggested_warmup_sets === undefined
      ? ""
      : optionalMetric(body.max_suggested_warmup_sets);
  const message = exerciseDefaultsSaveError({
    userId: "signed-in",
    exerciseId,
    baseWeightKg: optionalMetric(body.default_base_weight_kg),
    targetSets: optionalMetric(body.default_target_sets),
    targetReps: optionalMetric(body.default_target_reps),
    targetWeightKg: optionalMetric(body.default_target_weight_kg),
    maxWarmupSets: maxText,
  });
  if (message) {
    throw new ApiHttpError(400, message);
  }
  return {
    baseWeightKg: body.default_base_weight_kg == null ? null : Number(body.default_base_weight_kg),
    targetSets: body.default_target_sets == null ? null : Number(body.default_target_sets),
    targetReps: body.default_target_reps == null ? null : Number(body.default_target_reps),
    targetWeightKg: body.default_target_weight_kg == null ? null : Number(body.default_target_weight_kg),
    suggestWarmups,
    suggestTarget,
    maxWarmupSets: maxText.trim() === "" ? null : Number(maxText),
    updateMaxWarmupSets: body.max_suggested_warmup_sets !== undefined,
  };
}
