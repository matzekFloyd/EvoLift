import { bodyweightOnOrBefore, type BodyweightLogEntry } from "@/lib/bodyweight-log";
import {
  formatBodyweightMultiple,
  formatKgAmount,
  formatMilestoneTarget,
  type GoalProgress,
  type MilestoneDefinition,
} from "@/lib/milestone-progress";

/** Names the bodyweight an open goal uses now, or the bodyweight a reached goal used. */
export function formatGoalBodyweightTarget(input: {
  definition: MilestoneDefinition;
  progress: GoalProgress;
  achievedBodyweightKg: number | null;
  bodyweightEntries: readonly BodyweightLogEntry[];
  today: string;
}): string {
  const { definition } = input;
  if (definition.milestoneType !== "bodyweight_multiple" || definition.bodyweightMultiple == null) {
    return formatMilestoneTarget(definition);
  }

  const multiple = `${formatBodyweightMultiple(definition.bodyweightMultiple)}× bodyweight`;
  if (input.progress.kind === "missing_bodyweight") {
    return multiple;
  }

  const bodyweightKg =
    input.progress.kind === "achieved"
      ? input.achievedBodyweightKg
      : bodyweightOnOrBefore(input.bodyweightEntries, input.today);
  if (bodyweightKg == null || !(bodyweightKg > 0)) {
    return multiple;
  }

  const tense = input.progress.kind === "achieved" ? "was" : "is";
  return `${multiple} (${tense} ${formatKgAmount(bodyweightKg)})`;
}
