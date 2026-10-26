import { appPath } from "@/lib/app-paths";
import { compareByName, type NamedListSortDirection } from "@/lib/named-list-sort";

export type TemplateListSortKey = "name" | "exercises";

export type TemplateListSort = {
  key: TemplateListSortKey;
  direction: NamedListSortDirection;
};

export const TEMPLATE_LIST_EMPTY_LEAD = "No templates yet.";
export const TEMPLATE_LIST_EMPTY_ACTION = "Create a template";
export const TEMPLATE_LIST_EMPTY_TAIL = "to reuse an exercise list.";

export function templateEditHref(templateId: string): string {
  return appPath(`/templates/${templateId}/edit`);
}

export function templateExerciseCountLabel(count: number): string {
  return `${count} ${count === 1 ? "exercise" : "exercises"}`;
}

/** Equal exercise counts stay in name order. */
export function sortTemplateListRows<T extends { name: string; exerciseCount: number }>(
  rows: readonly T[],
  sort: TemplateListSort,
): T[] {
  return [...rows].sort((left, right) => {
    if (sort.key === "exercises") {
      const byCount = left.exerciseCount - right.exerciseCount;
      const primary = sort.direction === "asc" ? byCount : -byCount;
      return primary !== 0 ? primary : compareByName(left.name, right.name, "asc");
    }
    return compareByName(left.name, right.name, sort.direction);
  });
}
