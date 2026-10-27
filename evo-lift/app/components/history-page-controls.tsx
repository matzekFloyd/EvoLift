"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { HISTORY_PAGE_SIZE_OPTIONS, type HistoryPageSize } from "@/app/components/history-paging";

export {
  HISTORY_PAGE_SIZE_OPTIONS,
  historyPageCount,
  sliceRowsForPage,
  type HistoryPageSize,
} from "@/app/components/history-paging";

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
              className={`rounded-md px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
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
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Previous
        </ActionButton>
        <ActionButton
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          variant="secondary"
          size="sm"
          className="font-normal"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </ActionButton>
      </div>
    </div>
  );
}
