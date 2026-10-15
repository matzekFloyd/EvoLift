import type { GoalProgress } from "@/lib/milestone-progress";

export type GoalSummaryInput = {
  id: string;
  label: string;
  targetLabel: string;
  progress: GoalProgress;
};

export type GoalSummaryBar = {
  id: string;
  label: string;
  targetLabel: string;
  /** Rounded 0–100. Null when the goal still needs a bodyweight. */
  percent: number | null;
  achieved: boolean;
  pastDue: boolean;
};

function summaryPercent(progress: GoalProgress): number | null {
  if (progress.kind === "missing_bodyweight") {
    return null;
  }
  return Math.round(progress.percent);
}

/** Highest progress first. A goal that still needs a bodyweight stays at the bottom. */
export function buildGoalSummaryBars(items: readonly GoalSummaryInput[]): GoalSummaryBar[] {
  return items
    .map((item) => ({
      id: item.id,
      label: item.label,
      targetLabel: item.targetLabel,
      percent: summaryPercent(item.progress),
      achieved: item.progress.kind === "achieved",
      pastDue: item.progress.pastDue,
    }))
    .sort((left, right) => {
      const leftPercent = left.percent ?? -1;
      const rightPercent = right.percent ?? -1;
      if (leftPercent !== rightPercent) {
        return rightPercent - leftPercent;
      }
      const byLabel = left.label.localeCompare(right.label);
      if (byLabel !== 0) {
        return byLabel;
      }
      return left.targetLabel.localeCompare(right.targetLabel);
    });
}
