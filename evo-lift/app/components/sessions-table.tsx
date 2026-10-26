"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppTable,
  appTableHeadRowClassName,
  appTableRowClassName,
  appTableTdClassName,
  appTableThClassName,
} from "@/app/components/app-table";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { GoalReachedMark } from "@/app/components/goal-reached-mark";
import { HistoryPageNav } from "@/app/components/history-page-controls";
import { homeExerciseBadgeTone } from "@/app/home-sessions";
import { formatDateOnlyForLocale } from "@/lib/date-format";

type SortDirection = "asc" | "desc";

export type SessionsTableBadge = {
  slug: string;
  hasLoggedSet: boolean;
  skipped: boolean;
};

export type SessionsTableRow = {
  id: string;
  performedOn: string;
  notes: string;
  isPlanned: boolean;
  badges: SessionsTableBadge[];
};

type SessionsTableProps = {
  rows: SessionsTableRow[];
  dateHeaderLabel: string;
  emptyMessage: string;
  openingRowId?: string | null;
  highlightedPerformedOnDates?: string[] | null;
  /** Session dates (`YYYY-MM-DD`) that reached a goal, with the goal names for that day. */
  goalReachedByDate?: Record<string, string>;
  onOpenRow: (rowId: string) => void;
  pageSize?: number;
  showNotesColumn?: boolean;
  compactMode?: boolean;
};

export function SessionsTable({
  rows,
  dateHeaderLabel,
  emptyMessage,
  openingRowId = null,
  highlightedPerformedOnDates = null,
  goalReachedByDate = {},
  onOpenRow,
  pageSize = 20,
  showNotesColumn = true,
  compactMode = false,
}: SessionsTableProps) {
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedNotesIds, setExpandedNotesIds] = useState<Set<string>>(new Set());
  const highlightedDateSet = useMemo(
    () => new Set(highlightedPerformedOnDates ?? []),
    [highlightedPerformedOnDates],
  );

  const sortedRows = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const left = a.performedOn;
      const right = b.performedOn;
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return next;
  }, [rows, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function togglePerformedOnSort() {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function renderPerformedOnSortIndicator() {
    return <span>{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  function toggleExpandedNotes(id: string) {
    setExpandedNotesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <AppTable
        tableClassName={`w-full table-fixed ${compactMode ? "min-w-0" : "min-w-full"}`}
      >
          <colgroup>
            <col className={compactMode ? "w-[152px]" : "w-[180px]"} />
            <col className={showNotesColumn ? "w-[260px]" : "w-auto"} />
            {showNotesColumn ? <col className={compactMode ? "w-[140px]" : "w-[180px]"} /> : null}
          </colgroup>
          <thead>
            <tr className={appTableHeadRowClassName}>
              <th className={appTableThClassName}>
                <button
                  type="button"
                  onClick={togglePerformedOnSort}
                  className="inline-flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                >
                  {dateHeaderLabel} {renderPerformedOnSortIndicator()}
                </button>
              </th>
              <th className={appTableThClassName}>Exercises</th>
              {showNotesColumn ? <th className={appTableThClassName}>Notes</th> : null}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  className={`${appTableTdClassName} break-words whitespace-normal text-zinc-600`}
                  colSpan={showNotesColumn ? 3 : 2}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const isExpanded = expandedNotesIds.has(row.id);
                const needsTruncate = row.notes.length > 64;
                const visibleNotes =
                  needsTruncate && !isExpanded ? `${row.notes.slice(0, 64)}[...]` : row.notes || "-";
                const isOpening = openingRowId === row.id;
                const performedOnKey = row.performedOn.slice(0, 10);
                const goalLabel = goalReachedByDate[performedOnKey];
                const isHighlighted = highlightedDateSet.has(performedOnKey);
                return (
                  <tr
                    key={row.id}
                    className={[
                      appTableRowClassName,
                      "cursor-pointer",
                      isOpening ? "cursor-progress !bg-sky-100 hover:!bg-sky-100" : "",
                      !isOpening && isHighlighted ? "!bg-sky-100/70 hover:!bg-sky-100" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onOpenRow(row.id)}
                  >
                    <td className={appTableTdClassName}>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        {formatDateOnlyForLocale(row.performedOn)}
                        {goalLabel ? <GoalReachedMark label={goalLabel} /> : null}
                        {isOpening ? <span className="text-xs font-medium text-sky-700">Opening...</span> : null}
                      </span>
                    </td>
                    <td className={appTableTdClassName}>
                      <div className="flex flex-wrap items-center gap-1">
                        {row.badges.slice(0, 8).map((item, index) => (
                          <ExerciseBadgeChip
                            key={`${row.id}-${item.slug}-${index}`}
                            slug={item.slug}
                            variant={homeExerciseBadgeTone(item)}
                            title={item.skipped ? `${item.slug}, skipped` : item.slug}
                            aria-label={item.skipped ? `${item.slug}, skipped` : item.slug}
                          />
                        ))}
                        {row.badges.length === 0 ? <span className="text-zinc-500">-</span> : null}
                      </div>
                    </td>
                    {showNotesColumn ? (
                      <td className={appTableTdClassName}>
                        <span>{visibleNotes}</span>
                        {needsTruncate ? (
                          <button
                            type="button"
                            className="ml-2 text-xs underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleExpandedNotes(row.id);
                            }}
                          >
                            {isExpanded ? "[less]" : "[...]"}
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
      </AppTable>
      <HistoryPageNav page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
