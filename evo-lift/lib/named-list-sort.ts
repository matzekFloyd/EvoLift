export type NamedListSortDirection = "asc" | "desc";

export function compareByName(
  left: string,
  right: string,
  direction: NamedListSortDirection,
): number {
  const cmp = left.localeCompare(right, undefined, { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

export function sortRowsByName<T extends { name: string }>(
  rows: readonly T[],
  direction: NamedListSortDirection,
): T[] {
  return [...rows].sort((left, right) => compareByName(left.name, right.name, direction));
}

export function toggleNamedListSortDirection(
  current: NamedListSortDirection,
): NamedListSortDirection {
  return current === "asc" ? "desc" : "asc";
}
