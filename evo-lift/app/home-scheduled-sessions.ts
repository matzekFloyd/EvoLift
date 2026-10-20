import type { HomeExerciseBadge } from "@/app/home-sessions";

export type ScheduledHomeSession = {
  id: string;
  performedOn: string;
  notes: string;
  badges: HomeExerciseBadge[];
};

/**
 * Future sessions already linked from a plan day stay on that day.
 * The rest are listed under the plan.
 */
export function scheduledSessionsBesidePlan<T extends { id: string }>(
  plannedSessions: readonly T[],
  shownOnPlanDayIds: Iterable<string>,
): T[] {
  const shown = new Set(shownOnPlanDayIds);
  return plannedSessions.filter((session) => !shown.has(session.id));
}
