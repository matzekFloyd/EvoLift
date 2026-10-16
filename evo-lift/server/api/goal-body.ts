import { parseGoalForm, type MilestoneDefinition } from "@/lib/milestone-progress";
import { ApiHttpError } from "@/server/api/http";

export type ParsedGoal = {
  definition: MilestoneDefinition;
  dueOn: string | null;
  note: string | null;
};

function formString(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return " ";
}

export function parseGoalBody(body: Record<string, unknown>): ParsedGoal {
  const milestoneType = body.milestone_type;
  if (milestoneType !== "absolute" && milestoneType !== "bodyweight_multiple") {
    throw new ApiHttpError(400, "Please choose absolute or bodyweight multiple.");
  }
  const parsed = parseGoalForm({
    exerciseId: formString(body.exercise_id),
    milestoneType,
    targetWeightKg: formString(body.target_weight_kg),
    bodyweightMultiple: formString(body.bodyweight_multiple),
    minReps: formString(body.min_reps),
    dueOn: formString(body.due_on),
    note: formString(body.note),
  });
  if (!parsed.ok) {
    throw new ApiHttpError(400, parsed.message);
  }
  return {
    definition: parsed.definition,
    dueOn: parsed.dueOn,
    note: parsed.note,
  };
}
