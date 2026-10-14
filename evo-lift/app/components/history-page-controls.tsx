"use client";

import { ActionButton } from "@/app/components/action-button";

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

type HistoryPageSizeToggleProps = {
  value: HistoryPageSize;
  onChange: (value: HistoryPageSize) => void;
};

export function HistoryPageSizeToggle({ value, onChange }: HistoryPageSizeToggleProps) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-600" id="set-history-page-size-label">
        Show
      </p>
      <div
        className="mt-1 grid w-full grid-cols-4 gap-1 rounded-md border border-zinc-300 bg-zinc-50 p-1 sm:inline-flex sm:w-auto"
        role="group"
        aria-labelledby="set-history-page-size-label"
      >
        {HISTORY_PAGE_SIZE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                isSelected
                  ? "bg-sky-100 text-sky-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type HistoryPageNavProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function HistoryPageNav({ page, totalPages, onPageChange }: HistoryPageNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <p className="text-zinc-600">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <ActionButton
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          variant="secondary"
          size="sm"
          className="font-normal"
        >
          Previous
        </ActionButton>
        <ActionButton
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          variant="primary"
          size="sm"
          className="font-normal"
        >
          Next
        </ActionButton>
      </div>
    </div>
  );
}
