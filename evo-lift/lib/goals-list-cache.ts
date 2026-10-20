import type { SupabaseClient } from "@supabase/supabase-js";
import type { BodyweightLogEntry } from "@/lib/bodyweight-log";
import { invalidateExerciseMetadataCache, loadExerciseMetadata } from "@/lib/exercise-metadata-cache";
import type { ExercisePickerOption } from "@/lib/exercise-picker-options";
import {
  resolveMilestone,
  type GoalProgress,
  type MilestoneDefinition,
  type StoredAchievement,
} from "@/lib/milestone-progress";
import { coerceKg, loadMilestoneWorkingSets } from "@/lib/milestone-sets";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import type { Database } from "@/lib/supabase/database.types";
import { createUserMemoryCache } from "@/lib/user-memory-cache";

export type GoalMilestoneRow = Database["public"]["Tables"]["strength_milestones"]["Row"];

export type GoalsListSnapshot = {
  rows: GoalMilestoneRow[];
  progressEntries: Array<[string, GoalProgress]>;
  exerciseOptions: ExercisePickerOption[];
  hiddenExerciseIds: string[];
  bodyweightEntries: BodyweightLogEntry[];
  progressWriteFailed: boolean;
};

const cache = createUserMemoryCache<GoalsListSnapshot>();

export function peekGoalsList(userId: string): GoalsListSnapshot | null {
  return cache.peek(userId);
}

export function invalidateGoalsList() {
  cache.invalidate();
}

export function goalsListEpoch(): number {
  return cache.epoch();
}

export async function loadGoalsList(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { fresh?: boolean },
): Promise<{ snapshot: GoalsListSnapshot | null; error: string | null }> {
  try {
    const snapshot = await cache.load(userId, () => fetchGoalsList(client, userId), options);
    return { snapshot, error: null };
  } catch {
    return {
      snapshot: null,
      error: "Could not load goals.",
    };
  }
}

async function fetchGoalsList(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<GoalsListSnapshot> {
  const today = getTodayYyyyMmDd();
  const [milestoneResult, logResult, metadataRows, hiddenResult] = await Promise.all([
    client.from("strength_milestones").select("*").order("created_at", { ascending: true }),
    client
      .from("user_bodyweight_log")
      .select("logged_on, bodyweight_kg")
      .eq("user_id", userId)
      .order("logged_on", { ascending: true }),
    loadExerciseMetadata(client),
    client.from("user_hidden_exercises").select("exercise_id").eq("user_id", userId),
  ]);

  if (milestoneResult.error || logResult.error) {
    throw new Error("Could not load goals.");
  }

  const exerciseOptions = metadataRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
  }));
  const milestones = milestoneResult.data ?? [];
  const bodyweightEntries: BodyweightLogEntry[] = (logResult.data ?? []).flatMap((row) => {
    const bodyweightKg = Number(row.bodyweight_kg);
    if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) {
      return [];
    }
    return [{ loggedOn: row.logged_on.slice(0, 10), bodyweightKg }];
  });
  const sets = await loadMilestoneWorkingSets(
    client,
    milestones.map((row) => row.exercise_id),
    userId,
  );

  const progressEntries: Array<[string, GoalProgress]> = [];
  const writes: Array<{ id: string; stored: StoredAchievement }> = [];
  for (const row of milestones) {
    const resolved = resolveMilestone({
      definition: milestoneDefinition(row),
      stored: milestoneStored(row),
      sets,
      bodyweightEntries,
      dueOn: row.due_on,
      today,
      recalculate: false,
    });
    progressEntries.push([row.id, resolved.progress]);
    if (resolved.shouldWrite) {
      writes.push({ id: row.id, stored: resolved.stored });
    }
  }

  let progressWriteFailed = false;
  if (writes.length > 0) {
    const results = await Promise.all(
      writes.map((write) =>
        client
          .from("strength_milestones")
          .update({
            achieved_at: write.stored.achievedAt,
            achieved_bodyweight_kg: write.stored.achievedBodyweightKg,
            achieved_threshold_kg: write.stored.achievedThresholdKg,
          })
          .eq("id", write.id),
      ),
    );
    progressWriteFailed = results.some((result) => result.error);
  }

  return {
    rows: milestones,
    progressEntries,
    exerciseOptions,
    hiddenExerciseIds: (hiddenResult.data ?? []).map((row) => row.exercise_id),
    bodyweightEntries,
    progressWriteFailed,
  };
}

function milestoneDefinition(row: GoalMilestoneRow): MilestoneDefinition {
  return {
    exerciseId: row.exercise_id,
    milestoneType: row.milestone_type,
    targetWeightKg: coerceKg(row.target_weight_kg),
    bodyweightMultiple: coerceKg(row.bodyweight_multiple),
    minReps: row.min_reps,
  };
}

function milestoneStored(row: GoalMilestoneRow): StoredAchievement {
  return {
    achievedAt: row.achieved_at,
    achievedBodyweightKg: coerceKg(row.achieved_bodyweight_kg),
    achievedThresholdKg: coerceKg(row.achieved_threshold_kg),
  };
}

/** Test helper so a later case does not reuse catalog names from an earlier one. */
export function resetGoalsListCacheForTests() {
  invalidateGoalsList();
  invalidateExerciseMetadataCache();
}
