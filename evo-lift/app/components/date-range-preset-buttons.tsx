"use client";

import { useId } from "react";
import type { InsightsRange } from "@/lib/insights-data";
import { dateRangePresetOptions } from "@/app/components/date-range-presets";

type DateRangePresetButtonsProps = {
  marked: InsightsRange | null;
  onSelect: (range: InsightsRange) => void;
};

/** Shared 4w, 12w, 6m, and All control. The parent decides which dates each preset writes. */
export function DateRangePresetButtons({ marked, onSelect }: DateRangePresetButtonsProps) {
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className="text-xs font-medium text-zinc-600">
        Range
      </p>
      <div
        className="mt-1 grid w-full grid-cols-4 gap-1 rounded-md border border-zinc-300 bg-white p-1 sm:inline-flex sm:w-auto"
        role="group"
        aria-labelledby={labelId}
      >
        {dateRangePresetOptions.map((option) => {
          const isMarked = marked === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isMarked}
              onClick={() => onSelect(option.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${
                isMarked
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
