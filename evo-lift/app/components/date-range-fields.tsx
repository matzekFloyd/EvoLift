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
    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_auto]">
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
      <div className="col-span-2 sm:col-span-1">
        <div className={trailing ? "flex items-end gap-2" : undefined}>
          <div className={trailing ? "min-w-0 flex-1 sm:flex-none" : undefined}>
            <DateRangePresetButtons marked={marked} onSelect={onSelectRange} />
          </div>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
      </div>
    </div>
  );
}
