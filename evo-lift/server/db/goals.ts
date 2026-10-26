import type { SupabaseClient } from "@supabase/supabase-js";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { milestoneDefinitionChanged, resolveMilestone } from "@/lib/milestone-progress";
import { getTodayYyyyMmDd } from "@/lib/session-date";
import type { Database } from "@/lib/supabase/database.types";
import type { ParsedGoal } from "@/server/api/goal-body";
import { ApiHttpError } from "@/server/api/http";
import { loadMilestoneWorkingSets } from "@/lib/milestone-sets";
import { loadBodyweightLog } from "@/server/db/profile";

type Client = SupabaseClient<Database>;
type GoalRow = Database["public"]["Tables"]["strength_milestones"]["Row"];

function definitionFromRow(row: GoalRow) {
  return {
    exerciseId: row.exercise_id,
    milestoneType: row.milestone_type,
    targetWeightKg: row.target_weight_kg == null ? null : Number(row.target_weight_kg),
    bodyweightMultiple: row.bodyweight_multiple == null ? null : Number(row.bodyweight_multiple),
    minReps: row.min_reps,
  };
}

async function insertGoal(
  client: Client,
  userId: string,
  goal: ParsedGoal,
  achievement: {
    achieved_at: string | null;
    achieved_bodyweight_kg: number | null;
    achieved_threshold_kg: number | null;
  },
): Promise<GoalRow> {
  const { data, error } = await client
    .from("strength_milestones")
    .insert({
      user_id: userId,
      exercise_id: goal.definition.exerciseId,
      milestone_type: goal.definition.milestoneType,
      target_weight_kg: goal.definition.targetWeightKg,
      bodyweight_multiple: goal.definition.bodyweightMultiple,
      min_reps: goal.definition.minReps,
      due_on: goal.dueOn,
      note: goal.note,
      ...achievement,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Could not save this goal: ${error?.message ?? "Unknown error"}`);
  }
  return data;
}

export async function listGoals(client: Client, userId: string): Promise<GoalRow[]> {
  const { data, error } = await client
    .from("strength_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Could not load goals: ${error.message}`);
  }
  return data ?? [];
}

export async function getGoal(client: Client, userId: string, goalId: string): Promise<GoalRow | null> {
  const { data, error } = await client
    .from("strength_milestones")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Could not load goals: ${error.message}`);
  }
  return data;
}

async function exerciseUsesAssistance(client: Client, exerciseId: string): Promise<boolean> {
  const { data, error } = await client.from("exercises").select("slug").eq("id", exerciseId).maybeSingle();
  if (error) {
    throw new Error(`Could not save this goal: ${error.message}`);
  }
  return isAssistanceExercise(data?.slug);
}

export async function createGoal(client: Client, userId: string, goal: ParsedGoal): Promise<GoalRow> {
  const [sets, bodyweightEntries, assistance] = await Promise.all([
    loadMilestoneWorkingSets(client, [goal.definition.exerciseId], userId),
    loadBodyweightLog(client, userId),
    exerciseUsesAssistance(client, goal.definition.exerciseId),
  ]);
  const resolved = resolveMilestone({
    definition: goal.definition,
    stored: { achievedAt: null, achievedBodyweightKg: null, achievedThresholdKg: null },
    sets,
    bodyweightEntries,
    dueOn: goal.dueOn,
    today: getTodayYyyyMmDd(),
    recalculate: true,
    assistance,
  });
  return insertGoal(client, userId, goal, {
    achieved_at: resolved.stored.achievedAt,
    achieved_bodyweight_kg: resolved.stored.achievedBodyweightKg,
    achieved_threshold_kg: resolved.stored.achievedThresholdKg,
  });
}

export async function updateGoal(
  client: Client,
  userId: string,
  goalId: string,
  goal: ParsedGoal,
): Promise<GoalRow> {
  const existing = await getGoal(client, userId, goalId);
  if (!existing) {
    throw new ApiHttpError(404, "Goal not found.");
  }
  const changed = milestoneDefinitionChanged(definitionFromRow(existing), goal.definition);
  let achievement = {
    achieved_at: existing.achieved_at,
    achieved_bodyweight_kg: existing.achieved_bodyweight_kg,
    achieved_threshold_kg: existing.achieved_threshold_kg,
  };
  if (changed) {
    const [sets, bodyweightEntries, assistance] = await Promise.all([
      loadMilestoneWorkingSets(client, [goal.definition.exerciseId], userId),
      loadBodyweightLog(client, userId),
      exerciseUsesAssistance(client, goal.definition.exerciseId),
    ]);
    const resolved = resolveMilestone({
      definition: goal.definition,
      stored: {
        achievedAt: existing.achieved_at,
        achievedBodyweightKg:
          existing.achieved_bodyweight_kg == null ? null : Number(existing.achieved_bodyweight_kg),
        achievedThresholdKg:
          existing.achieved_threshold_kg == null ? null : Number(existing.achieved_threshold_kg),
      },
      sets,
      bodyweightEntries,
      dueOn: goal.dueOn,
      today: getTodayYyyyMmDd(),
      recalculate: true,
      assistance,
    });
    achievement = {
      achieved_at: resolved.stored.achievedAt,
      achieved_bodyweight_kg: resolved.stored.achievedBodyweightKg,
      achieved_threshold_kg: resolved.stored.achievedThresholdKg,
    };
  }
  const { data, error } = await client
    .from("strength_milestones")
    .update({
      exercise_id: goal.definition.exerciseId,
      milestone_type: goal.definition.milestoneType,
      target_weight_kg: goal.definition.targetWeightKg,
      bodyweight_multiple: goal.definition.bodyweightMultiple,
      min_reps: goal.definition.minReps,
      due_on: goal.dueOn,
      note: goal.note,
      ...achievement,
    })
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Could not save this goal: ${error?.message ?? "Unknown error"}`);
  }
  return data;
}

export async function deleteGoal(client: Client, userId: string, goalId: string): Promise<void> {
  const { data, error } = await client
    .from("strength_milestones")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Could not delete this goal: ${error.message}`);
  }
  if (!data) {
    throw new ApiHttpError(404, "Goal not found.");
  }
}
