import { coerceKg } from "@/lib/milestone-sets";
import type { MilestoneDefinition, MilestoneType, StoredAchievement } from "@/lib/milestone-progress";

export type GoalProgressSource = {
  exercise_id: string;
  milestone_type: MilestoneType;
  target_weight_kg: number | null;
  bodyweight_multiple: number | null;
  min_reps: number;
  achieved_at: string | null;
  achieved_bodyweight_kg: number | null;
  achieved_threshold_kg: number | null;
};

export function definitionFromRow(row: GoalProgressSource): MilestoneDefinition {
  return {
    exerciseId: row.exercise_id,
    milestoneType: row.milestone_type,
    targetWeightKg: coerceKg(row.target_weight_kg),
    bodyweightMultiple: coerceKg(row.bodyweight_multiple),
    minReps: row.min_reps,
  };
}

export function storedFromRow(row: GoalProgressSource): StoredAchievement {
  return {
    achievedAt: row.achieved_at,
    achievedBodyweightKg: coerceKg(row.achieved_bodyweight_kg),
    achievedThresholdKg: coerceKg(row.achieved_threshold_kg),
  };
}
