import { appPath } from "@/lib/app-paths";
import { sortRowsByName, type NamedListSortDirection } from "@/lib/named-list-sort";

export const PLAN_LIST_INTRO =
  "A plan is an ordered cycle of days. One plan can be active. From Home, start its next session in one step.";

export const PLAN_LIST_EMPTY_LEAD = "No plans yet.";
export const PLAN_LIST_EMPTY_ACTION = "Create a plan";
export const PLAN_LIST_EMPTY_TAIL = "to choose the next session on Home.";

export function planEditHref(planId: string): string {
  return appPath(`/plans/${planId}/edit`);
}

/** Active plan first, then the name sort. Home uses that plan for the next session. */
export function sortPlanListRows<T extends { name: string; isActive: boolean }>(
  rows: readonly T[],
  direction: NamedListSortDirection,
): T[] {
  const byName = sortRowsByName(rows, direction);
  return [...byName.filter((row) => row.isActive), ...byName.filter((row) => !row.isActive)];
}

export function planListStatusLabel(isActive: boolean): "Active" | null {
  return isActive ? "Active" : null;
}
