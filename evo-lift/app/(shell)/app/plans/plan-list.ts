import { appPath } from "@/lib/app-paths";
import { compareByName, type NamedListSortDirection } from "@/lib/named-list-sort";

export type PlanListSortKey = "name" | "days";

export type PlanListSort = {
  key: PlanListSortKey;
  direction: NamedListSortDirection;
};

export const PLAN_LIST_INTRO =
  "A plan is an ordered cycle of up to 7 days. One plan can be active. From Home, start its next session in one step.";

export const PLAN_LIST_EMPTY_LEAD = "No plans yet.";
export const PLAN_LIST_EMPTY_ACTION = "Create a plan";
export const PLAN_LIST_EMPTY_TAIL = "to choose the next session on Home.";

export function planEditHref(planId: string): string {
  return appPath(`/plans/${planId}/edit`);
}

/** Active plan first, then the chosen column. Home uses that plan for the next session. */
export function sortPlanListRows<T extends { name: string; isActive: boolean; dayCount: number }>(
  rows: readonly T[],
  sort: PlanListSort,
): T[] {
  const sorted = [...rows].sort((left, right) => {
    if (sort.key === "days") {
      const byDays = left.dayCount - right.dayCount;
      const primary = sort.direction === "asc" ? byDays : -byDays;
      return primary !== 0 ? primary : compareByName(left.name, right.name, "asc");
    }
    return compareByName(left.name, right.name, sort.direction);
  });
  return [...sorted.filter((row) => row.isActive), ...sorted.filter((row) => !row.isActive)];
}
