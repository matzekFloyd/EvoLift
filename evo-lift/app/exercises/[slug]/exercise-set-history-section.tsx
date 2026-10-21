import { useRouter } from "next/navigation";
import { appPath } from "@/lib/app-paths";
import { FilterX, Medal, Trophy } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { AppTable } from "@/app/components/app-table";
import {
  HistoryPageNav,
  HistoryPageSizeToggle,
  type HistoryPageSize,
} from "@/app/components/history-page-controls";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { SetKindIndicator } from "@/app/components/set-kind-indicator";
import type {
  ExerciseSetHistoryRow,
  HistorySortDirection,
  HistorySortKey,
} from "@/app/exercises/[slug]/exercise-detail-data";
import {
  historyRowSurfaceClass,
  historyRowTitle,
  historyValueClass,
} from "@/app/exercises/[slug]/exercise-history-display";
import { formatDateOnlyForLocale } from "@/lib/date-format";

const COMPACT_HISTORY_GRID =
  "grid grid-cols-[minmax(6.75rem,1fr)_minmax(2.75rem,3.5rem)_2.75rem_3.25rem_2.125rem] gap-x-1.5 @min-[22rem]:grid-cols-[minmax(6.75rem,1fr)_3.5rem_minmax(1.75rem,2.25rem)_2.75rem_3.25rem_2.125rem]";

const COMPACT_HISTORY_GRID_ASSISTANCE =
  "grid grid-cols-[minmax(6.75rem,1fr)_minmax(2.75rem,3.5rem)_2.75rem_2.125rem] gap-x-1.5 @min-[22rem]:grid-cols-[minmax(6.75rem,1fr)_3.5rem_minmax(1.75rem,2.25rem)_2.75rem_2.125rem]";

const COMPACT_HISTORY_TYPE_CELL = "hidden @min-[22rem]:flex @min-[22rem]:justify-center @min-[22rem]:items-center";

function GoalReachedMark({ label }: { label: string }) {
  return (
    <Trophy
      className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-amber-500"
      strokeWidth={1.75}
      role="img"
      aria-label={`Goal reached: ${label}`}
    />
  );
}

type ExerciseSetHistorySectionProps = {
  /** Number of rows after filters (before paging). */
  filteredCount: number;
  pagedCompactRows: readonly ExerciseSetHistoryRow[];
  pagedTableRows: readonly ExerciseSetHistoryRow[];
  topRepsRowKey: string | null;
  isCompactView: boolean;
  assistance: boolean;
  loadColumnLabel: string;
  sortKey: HistorySortKey;
  sortDirection: HistorySortDirection;
  onSort: (key: HistorySortKey) => void;
  pageSize: HistoryPageSize;
  onPageSizeChange: (size: HistoryPageSize) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
};

export function ExerciseSetHistorySection({
  filteredCount,
  pagedCompactRows,
  pagedTableRows,
  topRepsRowKey,
  isCompactView,
  assistance,
  loadColumnLabel,
  sortKey,
  sortDirection,
  onSort,
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  onPageChange,
  onClearFilters,
}: ExerciseSetHistorySectionProps) {
  const router = useRouter();

  function renderSortIndicator(nextKey: HistorySortKey) {
    if (sortKey !== nextKey) {
      return <span className="text-zinc-400">-</span>;
    }
    return <span>{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <section
      className={panelInsetClass("p-4 sm:p-5")}
      aria-labelledby="exercise-detail-history-heading"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <SectionHeading id="exercise-detail-history-heading">Set history</SectionHeading>
          <p className="mt-1 text-xs text-zinc-600">
            Each row is one set for this exercise. A trophy marks the set that reached a goal.
            Open a workout session to edit or review details.
          </p>
        </div>
        {filteredCount > 0 ? (
          <HistoryPageSizeToggle value={pageSize} onChange={onPageSizeChange} />
        ) : null}
      </div>
      {filteredCount === 0 ? (
        <div className={panelInsetClass("p-4 text-sm text-zinc-700")}>
          <p className="text-zinc-800">No sets match the current filters.</p>
          <ActionButton
            type="button"
            className="mt-3 text-sm font-normal text-amber-800 hover:text-amber-900"
            variant="secondary"
            size="sm"
            iconColor="amber"
            onClick={onClearFilters}
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear filters
          </ActionButton>
        </div>
      ) : isCompactView ? (
        <div className="@container overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <div
            className={`${assistance ? COMPACT_HISTORY_GRID_ASSISTANCE : COMPACT_HISTORY_GRID} border-b bg-zinc-50 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500`}
          >
            <span>Date</span>
            <span className={COMPACT_HISTORY_TYPE_CELL}>Type</span>
            <span className="text-right">Set</span>
            <span className="text-right">{assistance ? "Assist" : "Kg"}</span>
            {assistance ? null : (
              <span
                className="text-right"
                title="Loaded weight plus optional base weight for this exercise on that session."
              >
                Total
              </span>
            )}
            <span className="text-right">Reps</span>
          </div>
          {pagedCompactRows.map((row, index) => (
            <article
              key={`${row.sessionId}-${row.setNumber}-${index}`}
              className={`cursor-pointer border-b px-2 py-1.5 text-xs last:border-b-0 ${historyRowSurfaceClass(
                `${row.sessionId}-${row.setNumber}` === topRepsRowKey,
                Boolean(row.goalLabel),
              )}`}
              onClick={() => router.push(appPath(`/sessions/${row.sessionId}`))}
              title={historyRowTitle(row, `${row.sessionId}-${row.setNumber}` === topRepsRowKey)}
            >
              {(() => {
                const rowKey = `${row.sessionId}-${row.setNumber}`;
                const isTopRepsRow = rowKey === topRepsRowKey;
                const isGoalRow = Boolean(row.goalLabel);
                return (
                  <div
                    className={`${assistance ? COMPACT_HISTORY_GRID_ASSISTANCE : COMPACT_HISTORY_GRID} items-center text-zinc-700`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-medium tabular-nums text-zinc-900">
                        {formatDateOnlyForLocale(row.performedOn)}
                      </span>
                      {isTopRepsRow ? (
                        <Medal className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                      ) : isGoalRow && row.goalLabel ? (
                        <GoalReachedMark label={row.goalLabel} />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      {isTopRepsRow && row.goalLabel ? (
                        <GoalReachedMark label={row.goalLabel} />
                      ) : null}
                    </div>
                    <span className={`text-zinc-600 ${COMPACT_HISTORY_TYPE_CELL}`}>
                      <SetKindIndicator isWarmup={row.isWarmup} density="compact" />
                    </span>
                    <span className="text-right font-medium tabular-nums text-zinc-900">
                      <span className="hidden @min-[22rem]:inline">{row.setNumber}</span>
                      <span className="inline-flex items-center justify-end gap-0.5 leading-none @min-[22rem]:hidden">
                        <SetKindIndicator
                          isWarmup={row.isWarmup}
                          density="compact"
                          showLabel={false}
                        />
                        <span>{row.setNumber}</span>
                      </span>
                    </span>
                    <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                      {row.weightKg ?? "—"}
                    </span>
                    {assistance ? null : (
                      <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                        {row.totalKg.toFixed(1)}
                      </span>
                    )}
                    <span className={`text-right tabular-nums ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                      {row.reps}
                    </span>
                  </div>
                );
              })()}
            </article>
          ))}
        </div>
      ) : (
        <AppTable tableClassName="min-w-[760px]">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-2 font-medium">
                <button type="button" onClick={() => onSort("performedOn")} className="inline-flex items-center gap-1">
                  Session date {renderSortIndicator("performedOn")}
                </button>
              </th>
              <th className="px-2 py-2 font-medium">
                <button type="button" onClick={() => onSort("isWarmup")} className="inline-flex items-center gap-1">
                  Type {renderSortIndicator("isWarmup")}
                </button>
              </th>
              <th className="px-2 py-2 font-medium">
                <button type="button" onClick={() => onSort("setNumber")} className="inline-flex items-center gap-1">
                  Set # {renderSortIndicator("setNumber")}
                </button>
              </th>
              <th className="px-2 py-2 font-medium">
                <button type="button" onClick={() => onSort("weightKg")} className="inline-flex items-center gap-1">
                  {loadColumnLabel} {renderSortIndicator("weightKg")}
                </button>
              </th>
              {assistance ? null : (
                <th className="px-2 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort("totalKg")}
                    className="inline-flex items-center gap-1"
                    title="Loaded weight plus optional base weight for this exercise on that session."
                  >
                    Total (kg) {renderSortIndicator("totalKg")}
                  </button>
                </th>
              )}
              <th className="px-2 py-2 font-medium">
                <button type="button" onClick={() => onSort("reps")} className="inline-flex items-center gap-1">
                  Reps {renderSortIndicator("reps")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedTableRows.map((row, index) => (
              (() => {
                const rowKey = `${row.sessionId}-${row.setNumber}`;
                const isTopRepsRow = rowKey === topRepsRowKey;
                const isGoalRow = Boolean(row.goalLabel);
                return (
                  <tr
                    key={`${row.sessionId}-${row.setNumber}-${index}`}
                    className={`cursor-pointer border-b last:border-b-0 ${historyRowSurfaceClass(isTopRepsRow, isGoalRow)}`}
                    onClick={() => router.push(appPath(`/sessions/${row.sessionId}`))}
                    title={historyRowTitle(row, isTopRepsRow)}
                  >
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1">
                        {formatDateOnlyForLocale(row.performedOn)}
                        {isTopRepsRow ? (
                          <Medal className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                        ) : null}
                        {row.goalLabel ? <GoalReachedMark label={row.goalLabel} /> : null}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <SetKindIndicator isWarmup={row.isWarmup} density="default" />
                    </td>
                    <td className="px-2 py-2">{row.setNumber}</td>
                    <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                      {row.weightKg ?? "-"}
                    </td>
                    {assistance ? null : (
                      <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                        {row.totalKg.toFixed(1)}
                      </td>
                    )}
                    <td className={`px-2 py-2 ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                      {row.reps}
                    </td>
                  </tr>
                );
              })()
            ))}
          </tbody>
        </AppTable>
      )}
      {filteredCount > 0 ? (
        <HistoryPageNav page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}
