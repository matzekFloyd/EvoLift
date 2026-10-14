export const HISTORY_PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "all", label: "All" },
] as const;

export type HistoryPageSize = (typeof HISTORY_PAGE_SIZE_OPTIONS)[number]["value"];

export function historyPageCount(totalRows: number, pageSize: HistoryPageSize): number {
  if (pageSize === "all" || totalRows <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalRows / Number(pageSize)));
}

export function sliceRowsForPage<T>(rows: T[], page: number, pageSize: HistoryPageSize): T[] {
  if (pageSize === "all") {
    return rows;
  }
  const count = Number(pageSize);
  const start = (Math.max(1, page) - 1) * count;
  return rows.slice(start, start + count);
}
