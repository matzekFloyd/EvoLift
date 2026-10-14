import { formatBodyweightMultiple, type MilestoneType } from "@/lib/milestone-progress";
import { coerceKg } from "@/lib/milestone-sets";

export type GoalDraft = {
  id: string | null;
  exerciseId: string;
  milestoneType: MilestoneType;
  targetWeightKg: string;
  bodyweightMultiple: string;
  minReps: string;
  dueOn: string;
  note: string;
};

export type GoalDraftSource = {
  id: string;
  exercise_id: string;
  milestone_type: MilestoneType;
  target_weight_kg: number | null;
  bodyweight_multiple: number | null;
  min_reps: number;
  due_on: string | null;
  note: string | null;
};

export function emptyGoalDraft(): GoalDraft {
  return {
    id: null,
    exerciseId: "",
    milestoneType: "absolute",
    targetWeightKg: "",
    bodyweightMultiple: "",
    minReps: "1",
    dueOn: "",
    note: "",
  };
}

export function draftFromRow(row: GoalDraftSource): GoalDraft {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    milestoneType: row.milestone_type,
    targetWeightKg: row.target_weight_kg == null ? "" : String(coerceKg(row.target_weight_kg)),
    bodyweightMultiple:
      row.bodyweight_multiple == null ? "" : formatBodyweightMultiple(Number(row.bodyweight_multiple)),
    minReps: String(row.min_reps),
    dueOn: row.due_on ? row.due_on.slice(0, 10) : "",
    note: row.note ?? "",
  };
}
