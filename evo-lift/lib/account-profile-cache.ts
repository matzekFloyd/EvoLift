import type { SupabaseClient } from "@supabase/supabase-js";
import { latestBodyweightEntry } from "@/lib/bodyweight-log";
import { loadExerciseMetadata } from "@/lib/exercise-metadata-cache";
import type { Database } from "@/lib/supabase/database.types";
import { createUserMemoryCache } from "@/lib/user-memory-cache";

export type AccountExerciseDefault = Database["public"]["Tables"]["user_exercise_defaults"]["Row"];

export type AccountBodyweightRow = {
  id: string;
  loggedOn: string;
  bodyweightKg: number;
};

export type AccountProfileSnapshot = {
  exerciseOptions: Array<{ id: string; label: string; slug: string }>;
  hiddenExerciseIds: string[];
  defaults: AccountExerciseDefault[];
  hasProfileMetrics: boolean;
  bodyweightLog: AccountBodyweightRow[];
  bodyweightKg: string;
  heightCm: string;
  sex: string;
  dateOfBirth: string;
  birthYearFallback: number | null;
};

export type AccountProfileLoadFailure = "profile" | "hidden" | "exercises" | "defaults";

const cache = createUserMemoryCache<AccountProfileSnapshot>();

export function peekAccountProfile(userId: string): AccountProfileSnapshot | null {
  return cache.peek(userId);
}

export function invalidateAccountProfile() {
  cache.invalidate();
}

export function accountProfileEpoch(): number {
  return cache.epoch();
}

export async function loadAccountProfile(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { fresh?: boolean },
): Promise<{ snapshot: AccountProfileSnapshot | null; error: AccountProfileLoadFailure | null }> {
  try {
    const snapshot = await cache.load(userId, () => fetchAccountProfile(client, userId), options);
    return { snapshot, error: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "hidden") {
      return { snapshot: null, error: "hidden" };
    }
    if (reason === "defaults") {
      return { snapshot: null, error: "defaults" };
    }
    if (reason === "profile") {
      return { snapshot: null, error: "profile" };
    }
    return { snapshot: null, error: "exercises" };
  }
}

async function fetchAccountProfile(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<AccountProfileSnapshot> {
  let exerciseOptions: AccountProfileSnapshot["exerciseOptions"];
  try {
    const metadata = await loadExerciseMetadata(client);
    exerciseOptions = metadata.map((row) => ({
      id: row.id,
      label: row.label,
      slug: row.slug,
    }));
  } catch {
    throw new Error("exercises");
  }

  const [profileResult, hiddenResult, logResult, defaultsResult] = await Promise.all([
    client
      .from("user_profile_metrics")
      .select("bodyweight_kg,height_cm,birth_year,sex,date_of_birth")
      .eq("user_id", userId)
      .maybeSingle(),
    client.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId),
    client
      .from("user_bodyweight_log")
      .select("id, logged_on, bodyweight_kg")
      .eq("user_id", userId)
      .order("logged_on", { ascending: false }),
    client.from("user_exercise_defaults").select("*").eq("user_id", userId),
  ]);

  if (profileResult.error || logResult.error) {
    throw new Error("profile");
  }
  if (hiddenResult.error) {
    throw new Error("hidden");
  }
  if (defaultsResult.error) {
    throw new Error("defaults");
  }

  const profile = profileResult.data;
  const bodyweightLog: AccountBodyweightRow[] = (logResult.data ?? []).map((row) => ({
    id: row.id,
    loggedOn: row.logged_on.slice(0, 10),
    bodyweightKg: Number(row.bodyweight_kg),
  }));
  const latestBodyweight = latestBodyweightEntry(bodyweightLog);
  return {
    exerciseOptions,
    hiddenExerciseIds: (hiddenResult.data ?? []).map((row) => row.exercise_id),
    defaults: defaultsResult.data ?? [],
    hasProfileMetrics: profile != null,
    bodyweightLog,
    bodyweightKg:
      latestBodyweight
        ? String(latestBodyweight.bodyweightKg)
        : profile?.bodyweight_kg == null
          ? ""
          : String(profile.bodyweight_kg),
    heightCm: profile?.height_cm == null ? "" : String(profile.height_cm),
    sex: profile?.sex ?? "",
    dateOfBirth: profile?.date_of_birth ?? "",
    birthYearFallback: profile?.date_of_birth ? null : (profile?.birth_year ?? null),
  };
}
