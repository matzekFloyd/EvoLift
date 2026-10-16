import type { SupabaseClient } from "@supabase/supabase-js";
import { birthYearFromDate, type ParsedBodyMetrics } from "@/lib/body-metrics";
import { latestBodyweightEntry, type BodyweightLogEntry } from "@/lib/bodyweight-log";
import { isCompoundExercise } from "@/lib/compound-exercise";
import type { Database } from "@/lib/supabase/database.types";
import type { ParsedExerciseDefaults } from "@/server/api/account-body";
import { ApiHttpError } from "@/server/api/http";

type Client = SupabaseClient<Database>;

export type ProfileResponse = {
  bodyweight_kg: number | null;
  height_cm: number | null;
  sex: "female" | "male" | null;
  date_of_birth: string | null;
};

export type BodyweightEntryResponse = {
  id: string;
  logged_on: string;
  bodyweight_kg: number;
};

async function listBodyweightRows(client: Client, userId: string): Promise<BodyweightEntryResponse[]> {
  const { data, error } = await client
    .from("user_bodyweight_log")
    .select("id, logged_on, bodyweight_kg")
    .eq("user_id", userId)
    .order("logged_on", { ascending: true });
  if (error) {
    throw new Error(`Could not load bodyweight: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    logged_on: row.logged_on.slice(0, 10),
    bodyweight_kg: Number(row.bodyweight_kg),
  }));
}

export async function listBodyweightEntries(
  client: Client,
  userId: string,
): Promise<BodyweightEntryResponse[]> {
  return listBodyweightRows(client, userId);
}

export async function loadBodyweightLog(
  client: Client,
  userId: string,
): Promise<BodyweightLogEntry[]> {
  const rows = await listBodyweightRows(client, userId);
  return rows.map((row) => ({ loggedOn: row.logged_on, bodyweightKg: row.bodyweight_kg }));
}

async function syncProfileBodyweight(
  client: Client,
  userId: string,
  entries: BodyweightLogEntry[],
): Promise<void> {
  const latest = latestBodyweightEntry(entries);
  const bodyweight_kg = latest?.bodyweightKg ?? null;
  const { data: updatedRows, error: updateError } = await client
    .from("user_profile_metrics")
    .update({ bodyweight_kg })
    .eq("user_id", userId)
    .select("user_id");
  if (updateError) {
    throw new Error(`Could not save bodyweight: ${updateError.message}`);
  }
  if (!updatedRows?.length) {
    const { error: insertError } = await client.from("user_profile_metrics").insert({
      user_id: userId,
      bodyweight_kg,
    });
    if (insertError) {
      throw new Error(`Could not save bodyweight: ${insertError.message}`);
    }
  }
}

export async function getProfile(client: Client, userId: string): Promise<ProfileResponse> {
  const [{ data, error }, entries] = await Promise.all([
    client
      .from("user_profile_metrics")
      .select("bodyweight_kg, height_cm, sex, date_of_birth")
      .eq("user_id", userId)
      .maybeSingle(),
    loadBodyweightLog(client, userId),
  ]);
  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }
  const latest = latestBodyweightEntry(entries);
  const stored = data?.bodyweight_kg;
  return {
    bodyweight_kg:
      latest?.bodyweightKg ??
      (stored == null || !Number.isFinite(Number(stored)) ? null : Number(stored)),
    height_cm: data?.height_cm == null ? null : Number(data.height_cm),
    sex: data?.sex === "female" || data?.sex === "male" ? data.sex : null,
    date_of_birth: data?.date_of_birth ? data.date_of_birth.slice(0, 10) : null,
  };
}

export async function saveProfile(
  client: Client,
  userId: string,
  metrics: ParsedBodyMetrics,
  today: string,
): Promise<ProfileResponse> {
  let entries = await loadBodyweightLog(client, userId);
  if (metrics.bodyweight_kg != null) {
    const { data: saved, error } = await client
      .from("user_bodyweight_log")
      .upsert(
        {
          user_id: userId,
          logged_on: today,
          bodyweight_kg: metrics.bodyweight_kg,
        },
        { onConflict: "user_id,logged_on" },
      )
      .select("id, logged_on, bodyweight_kg")
      .single();
    if (error || !saved) {
      throw new Error(`Could not save bodyweight: ${error?.message ?? "Unknown error"}`);
    }
    entries = [
      ...entries.filter((entry) => entry.loggedOn !== today),
      { loggedOn: saved.logged_on.slice(0, 10), bodyweightKg: Number(saved.bodyweight_kg) },
    ];
  }

  const { data: existing, error: existingError } = await client
    .from("user_profile_metrics")
    .select("birth_year")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) {
    throw new Error(`Could not save body metrics: ${existingError.message}`);
  }
  const latest = latestBodyweightEntry(entries);
  const payload = {
    bodyweight_kg: latest?.bodyweightKg ?? null,
    height_cm: metrics.height_cm,
    sex: metrics.sex,
    date_of_birth: metrics.date_of_birth,
    birth_year: metrics.date_of_birth
      ? birthYearFromDate(metrics.date_of_birth)
      : (existing?.birth_year ?? null),
  };
  const { data: updatedRows, error: updateError } = await client
    .from("user_profile_metrics")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id");
  if (updateError) {
    throw new Error(`Could not save body metrics: ${updateError.message}`);
  }
  if (!updatedRows?.length) {
    const { error: insertError } = await client.from("user_profile_metrics").insert({
      user_id: userId,
      ...payload,
    });
    if (insertError) {
      throw new Error(`Could not save body metrics: ${insertError.message}`);
    }
  }
  return getProfile(client, userId);
}

export async function createBodyweightEntry(
  client: Client,
  userId: string,
  input: { loggedOn: string; bodyweightKg: number },
): Promise<BodyweightEntryResponse> {
  const { data, error } = await client
    .from("user_bodyweight_log")
    .insert({
      user_id: userId,
      logged_on: input.loggedOn,
      bodyweight_kg: input.bodyweightKg,
    })
    .select("id, logged_on, bodyweight_kg")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      throw new ApiHttpError(400, "That date already has a bodyweight.");
    }
    throw new Error(`Could not save bodyweight: ${error?.message ?? "Unknown error"}`);
  }
  await syncProfileBodyweight(client, userId, await loadBodyweightLog(client, userId));
  return {
    id: data.id,
    logged_on: data.logged_on.slice(0, 10),
    bodyweight_kg: Number(data.bodyweight_kg),
  };
}

export async function updateBodyweightEntry(
  client: Client,
  userId: string,
  entryId: string,
  input: { loggedOn: string; bodyweightKg: number },
): Promise<BodyweightEntryResponse> {
  const { data, error } = await client
    .from("user_bodyweight_log")
    .update({ logged_on: input.loggedOn, bodyweight_kg: input.bodyweightKg })
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("id, logged_on, bodyweight_kg")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      throw new ApiHttpError(400, "That date already has a bodyweight.");
    }
    throw new Error(`Could not save bodyweight: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Bodyweight entry not found.");
  }
  await syncProfileBodyweight(client, userId, await loadBodyweightLog(client, userId));
  return {
    id: data.id,
    logged_on: data.logged_on.slice(0, 10),
    bodyweight_kg: Number(data.bodyweight_kg),
  };
}

export async function deleteBodyweightEntry(
  client: Client,
  userId: string,
  entryId: string,
): Promise<void> {
  const { data, error } = await client
    .from("user_bodyweight_log")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Could not remove bodyweight: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Bodyweight entry not found.");
  }
  await syncProfileBodyweight(client, userId, await loadBodyweightLog(client, userId));
}

export async function listHiddenExerciseIds(client: Client, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("user_hidden_exercises")
    .select("exercise_id")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Could not load hidden exercises: ${error.message}`);
  }
  return (data ?? []).map((row) => row.exercise_id);
}

export async function replaceHiddenExercises(
  client: Client,
  userId: string,
  exerciseIds: string[],
): Promise<string[]> {
  const current = new Set(await listHiddenExerciseIds(client, userId));
  const next = new Set(exerciseIds);
  const toRemove = [...current].filter((id) => !next.has(id));
  const toAdd = [...next].filter((id) => !current.has(id));
  if (toRemove.length > 0) {
    const { error } = await client
      .from("user_hidden_exercises")
      .delete()
      .eq("user_id", userId)
      .in("exercise_id", toRemove);
    if (error) {
      throw new Error(`Could not unhide exercise: ${error.message}`);
    }
  }
  if (toAdd.length > 0) {
    const { error } = await client.from("user_hidden_exercises").insert(
      toAdd.map((exerciseId) => ({ user_id: userId, exercise_id: exerciseId })),
    );
    if (error && error.code !== "23505") {
      throw new Error(`Could not hide exercise: ${error.message}`);
    }
  }
  return listHiddenExerciseIds(client, userId);
}

export async function getExerciseDefaults(client: Client, userId: string) {
  const [{ data: metrics, error: metricsError }, { data: rows, error }] = await Promise.all([
    client
      .from("user_profile_metrics")
      .select("max_suggested_warmup_sets")
      .eq("user_id", userId)
      .maybeSingle(),
    client.from("user_exercise_defaults").select("*").eq("user_id", userId),
  ]);
  if (metricsError) {
    throw new Error(`Could not load warmup suggestions: ${metricsError.message}`);
  }
  if (error) {
    throw new Error(`Could not load exercise defaults: ${error.message}`);
  }
  return {
    max_suggested_warmup_sets: metrics?.max_suggested_warmup_sets ?? null,
    exercises: (rows ?? []).map((row) => ({
      exercise_id: row.exercise_id,
      default_base_weight_kg: row.default_base_weight_kg,
      default_target_sets: row.default_target_sets,
      default_target_reps: row.default_target_reps,
      default_target_weight_kg: row.default_target_weight_kg,
      suggest_warmups: row.suggest_warmups,
      suggest_target: row.suggest_target,
    })),
  };
}

async function saveMaxWarmupSets(client: Client, userId: string, maxWarmupSets: number | null) {
  const payload = { max_suggested_warmup_sets: maxWarmupSets };
  const { data: updatedRows, error } = await client
    .from("user_profile_metrics")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id");
  if (error) {
    throw new Error(`Could not save warmup suggestions: ${error.message}`);
  }
  if (!updatedRows?.length) {
    const { error: insertError } = await client.from("user_profile_metrics").insert({
      user_id: userId,
      ...payload,
    });
    if (insertError) {
      throw new Error(`Could not save warmup suggestions: ${insertError.message}`);
    }
  }
}

export async function saveExerciseDefaults(
  client: Client,
  userId: string,
  exerciseId: string,
  input: ParsedExerciseDefaults,
) {
  const { data: exercise, error: exerciseError } = await client
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .maybeSingle();
  if (exerciseError) {
    throw new Error(`Could not save exercise defaults: ${exerciseError.message}`);
  }
  if (!exercise) {
    throw new ApiHttpError(400, "Please select an exercise.");
  }
  if (input.updateMaxWarmupSets) {
    await saveMaxWarmupSets(client, userId, input.maxWarmupSets);
  }
  const { data, error } = await client
    .from("user_exercise_defaults")
    .upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        default_base_weight_kg: input.baseWeightKg,
        default_target_sets: input.targetSets,
        default_target_reps: input.targetReps,
        default_target_weight_kg: input.targetWeightKg,
        suggest_warmups: input.suggestWarmups,
        suggest_target: input.suggestTarget,
      },
      { onConflict: "user_id,exercise_id" },
    )
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Could not save exercise defaults: ${error?.message ?? "Unknown error"}`);
  }
  return getExerciseDefaults(client, userId);
}

export async function clearExerciseDefaults(client: Client, userId: string, exerciseId: string) {
  const { data: exercise, error: exerciseError } = await client
    .from("exercises")
    .select("id, slug")
    .eq("id", exerciseId)
    .maybeSingle();
  if (exerciseError) {
    throw new Error(`Could not clear exercise defaults: ${exerciseError.message}`);
  }
  if (!exercise) {
    throw new ApiHttpError(400, "Please select an exercise first.");
  }
  const { error } = await client.from("user_exercise_defaults").upsert(
    {
      user_id: userId,
      exercise_id: exerciseId,
      default_base_weight_kg: null,
      default_target_sets: null,
      default_target_reps: null,
      default_target_weight_kg: null,
      suggest_warmups: isCompoundExercise(exercise.slug),
      suggest_target: true,
    },
    { onConflict: "user_id,exercise_id" },
  );
  if (error) {
    throw new Error(`Could not clear exercise defaults: ${error.message}`);
  }
  return getExerciseDefaults(client, userId);
}
