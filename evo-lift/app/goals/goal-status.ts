export type GoalStatusMark = {
  tone: "warning" | "success";
  label: "Past due" | "Achieved";
  description?: string;
};

const PAST_DUE_DESCRIPTION = "The due date has passed. This goal stays active.";

/**
 * On a card, the achieved date already says the goal was reached.
 * Keep the badge when that date is missing, and always keep Past due.
 */
export function goalCardStatusMark(input: {
  pastDue: boolean;
  achieved: boolean;
  achievedDetail: boolean;
}): GoalStatusMark | null {
  const mark = goalStatusMark(input);
  if (mark?.label === "Achieved" && input.achievedDetail) {
    return null;
  }
  return mark;
}

/**
 * Exception status only. In progress is the quiet default, so it has no badge.
 * Past due wins when a reached goal is also late.
 */
export function goalStatusMark(input: { pastDue: boolean; achieved: boolean }): GoalStatusMark | null {
  if (input.pastDue) {
    return {
      tone: "warning",
      label: "Past due",
      description: PAST_DUE_DESCRIPTION,
    };
  }
  if (input.achieved) {
    return { tone: "success", label: "Achieved" };
  }
  return null;
}
