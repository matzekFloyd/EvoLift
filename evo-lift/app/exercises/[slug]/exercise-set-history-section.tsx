import Link from "next/link";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/app-paths";
import { FilterX, Medal } from "lucide-react";
import { GoalReachedMark } from "@/app/components/goal-reached-mark";
import { ActionButton } from "@/app/components/action-button";
import {
  AppTable,
  appTableHeadRowClassName,
  appTableTdClassName,
  appTableThClassName,
} from "@/app/components/app-table";
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
import {
  compactHistoryCellPaddingClassName,
  compactHistoryFrameClassName,
  compactHistoryGridClass,
  historyTableClassName,
} from "@/app/exercises/[slug]/exercise-set-history-layout";
import { formatDateOnlyForLocale } from "@/lib/date-format";

const COMPACT_HISTORY_TYPE_CELL = "hidden @min-[22rem]:flex @min-[22rem]:justify-center @min-[22rem]:items-center";

const sortButtonClassName =
  "inline-flex max-w-full flex-wrap items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

const sessionLinkClassName =
  "min-w-0 truncate rounded-sm font-medium tabular-nums text-zinc-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

function CompactLoadHeader({ label }: { label: string }) {
  const name = label.endsWith(" (kg)") ? label.slice(0, -" (kg)".length) : label;
  return (
    <span className="text-right text-[10px] leading-tight" title={label}>
      {name}
      <span className="block">(kg)</span>
    </span>
  );
}

function BestSetMark() {
  return (
    <>
      <Medal className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
      <span className="sr-only">Best set</span>
    </>
  );
}

function SessionDateLink({ sessionId, performedOn }: { sessionId: string; performedOn: string }) {
  const label = formatDateOnlyForLocale(performedOn);
  return (
    <Link
      href={appPath(`/sessions/${sessionId}`)}
      className={sessionLinkClassName}
      title={label}
      onClick={(event) => event.stopPropagation()}
    >
      {label}
    </Link>
  );
}

type ExerciseSetHistorySectionProps = {
  /** Number of rows after filters (before paging). */
  filteredCount: number;
  pagedCompactRows: readonly ExerciseSetHistoryRow[];
  pagedTableRows: readonly ExerciseSetHistoryRow[];
  topRepsRowKey: string | null;
  isCompactView: boolean;
  hideWarmups: boolean;
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
  hideWarmups,
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
  const showSetType = !hideWarmups;
  const compactGridClassName = compactHistoryGridClass(assistance, showSetType);

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
        <div className="text-sm text-zinc-700">
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
        <div className={compactHistoryFrameClassName}>
          <div
            className={`${compactGridClassName} ${compactHistoryCellPaddingClassName} border-b bg-zinc-200/60 py-1.5 text-left text-xs font-medium text-zinc-600`}
          >
            <span>Date</span>
            {hideWarmups ? null : <span className={COMPACT_HISTORY_TYPE_CELL}>Type</span>}
            <span className="text-right">Set</span>
            <CompactLoadHeader label={loadColumnLabel} />
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
              className={`cursor-pointer border-b ${compactHistoryCellPaddingClassName} py-1.5 text-xs last:border-b-0 ${historyRowSurfaceClass(
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
                    className={`${compactGridClassName} items-center text-zinc-700`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <SessionDateLink sessionId={row.sessionId} performedOn={row.performedOn} />
                      {isTopRepsRow ? (
                        <BestSetMark />
                      ) : isGoalRow && row.goalLabel ? (
                        <GoalReachedMark label={row.goalLabel} />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      {isTopRepsRow && row.goalLabel ? (
                        <GoalReachedMark label={row.goalLabel} />
                      ) : null}
                    </div>
                    {hideWarmups ? null : (
                      <span className={`text-zinc-600 ${COMPACT_HISTORY_TYPE_CELL}`}>
                        <SetKindIndicator isWarmup={row.isWarmup} density="compact" />
                      </span>
                    )}
                    <span className="text-right font-medium tabular-nums text-zinc-900">
                      {hideWarmups ? (
                        row.setNumber
                      ) : (
                        <>
                          <span className="hidden @min-[22rem]:inline">{row.setNumber}</span>
                          <span className="inline-flex items-center justify-end gap-0.5 leading-none @min-[22rem]:hidden">
                            <SetKindIndicator
                              isWarmup={row.isWarmup}
                              density="compact"
                              showLabel={false}
                            />
                            <span>{row.setNumber}</span>
                          </span>
                        </>
                      )}
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
        <AppTable tableClassName={historyTableClassName}>
          <thead>
            <tr className={appTableHeadRowClassName}>
              <th className={appTableThClassName}>
                <button type="button" onClick={() => onSort("performedOn")} className={sortButtonClassName}>
                  Session date {renderSortIndicator("performedOn")}
                </button>
              </th>
              {hideWarmups ? null : (
                <th className={appTableThClassName}>
                  <button type="button" onClick={() => onSort("isWarmup")} className={sortButtonClassName}>
                    Type {renderSortIndicator("isWarmup")}
                  </button>
                </th>
              )}
              <th className={appTableThClassName}>
                <button type="button" onClick={() => onSort("setNumber")} className={sortButtonClassName}>
                  Set # {renderSortIndicator("setNumber")}
                </button>
              </th>
              <th className={appTableThClassName}>
                <button type="button" onClick={() => onSort("weightKg")} className={sortButtonClassName}>
                  {loadColumnLabel} {renderSortIndicator("weightKg")}
                </button>
              </th>
              {assistance ? null : (
                <th className={appTableThClassName}>
                  <button
                    type="button"
                    onClick={() => onSort("totalKg")}
                    className={sortButtonClassName}
                    title="Loaded weight plus optional base weight for this exercise on that session."
                  >
                    Total (kg) {renderSortIndicator("totalKg")}
                  </button>
                </th>
              )}
              <th className={appTableThClassName}>
                <button type="button" onClick={() => onSort("reps")} className={sortButtonClassName}>
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
                    <td className={appTableTdClassName}>
                      <span className="inline-flex max-w-full flex-wrap items-center gap-1 text-left">
                        <SessionDateLink sessionId={row.sessionId} performedOn={row.performedOn} />
                        {isTopRepsRow ? <BestSetMark /> : null}
                        {row.goalLabel ? <GoalReachedMark label={row.goalLabel} /> : null}
                      </span>
                    </td>
                    {hideWarmups ? null : (
                      <td className={appTableTdClassName}>
                        <SetKindIndicator isWarmup={row.isWarmup} density="default" />
                      </td>
                    )}
                    <td className={appTableTdClassName}>{row.setNumber}</td>
                    <td className={`${appTableTdClassName} ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                      {row.weightKg ?? "-"}
                    </td>
                    {assistance ? null : (
                      <td className={`${appTableTdClassName} ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
                        {row.totalKg.toFixed(1)}
                      </td>
                    )}
                    <td className={`${appTableTdClassName} ${historyValueClass(isTopRepsRow, isGoalRow)}`}>
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
