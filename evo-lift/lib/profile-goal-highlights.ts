import { sortProfileAchievedGoals } from "@/lib/profile-summary";

export type ProfileGoalCandidate = {
  id: string;
  label: string;
  slug: string;
  href: string;
  targetLabel: string;
  achievedAt: string | null;
  percent: number | null;
  pastDue: boolean;
  achieved: boolean;
};

export type ProfileGoalHighlights = {
  mode: "achieved" | "closest";
  goals: ProfileGoalCandidate[];
};

const HIGHLIGHT_COUNT = 3;

/** Newest reached goals, or the three open goals nearest their target when none are reached. */
export function profileGoalHighlights(goals: readonly ProfileGoalCandidate[]): ProfileGoalHighlights {
  const achieved = goals.filter((goal) => goal.achieved);
  if (achieved.length > 0) {
    return {
      mode: "achieved",
      goals: sortProfileAchievedGoals(achieved).slice(0, HIGHLIGHT_COUNT),
    };
  }
  return {
    mode: "closest",
    goals: [...goals]
      .sort((left, right) => {
        const byPercent = (right.percent ?? -1) - (left.percent ?? -1);
        if (byPercent !== 0) {
          return byPercent;
        }
        return left.label.localeCompare(right.label);
      })
      .slice(0, HIGHLIGHT_COUNT),
  };
}
