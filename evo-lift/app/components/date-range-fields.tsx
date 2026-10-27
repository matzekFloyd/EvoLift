"use client";

import type { ReactNode } from "react";
import { DateInput } from "@/app/components/date-input";
import { DateRangePresetButtons } from "@/app/components/date-range-preset-buttons";
import type { InsightsRange } from "@/lib/insights-data";

type DateRangeFieldsProps = {
  from: string;
  to: string;
  max?: string;
  marked: InsightsRange | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSelectRange: (range: InsightsRange) => void;
  /** Sits on the range row, such as Clear filters. */
  trailing?: ReactNode;
};

/** From, To, and the shared range buttons. Clear filters stays with the screen. */
export function DateRangeFields({
  from,
  to,
  max,
  marked,
  onFromChange,
  onToChange,
  onSelectRange,
  trailing,
}: DateRangeFieldsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:max-w-[22.5rem]">
        <label className="block min-w-0 text-xs font-medium text-zinc-600">
          From
          <DateInput
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            max={max}
            size="compact"
            className="mt-1 w-full min-w-0"
          />
        </label>
        <label className="block min-w-0 text-xs font-medium text-zinc-600">
          To
          <DateInput
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            max={max}
            size="compact"
            className="mt-1 w-full min-w-0"
          />
        </label>
      </div>
      <div
        className={
          trailing ? "flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" : undefined
        }
      >
        <div className="min-w-0 shrink-0">
          <DateRangePresetButtons marked={marked} onSelect={onSelectRange} />
        </div>
        {trailing ? <div className="shrink-0 self-end">{trailing}</div> : null}
      </div>
    </div>
  );
}
