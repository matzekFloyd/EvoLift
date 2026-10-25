import { FilterX } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { Checkbox } from "@/app/components/checkbox";
import { DateInput } from "@/app/components/date-input";
import { panelInsetClass } from "@/app/components/panel-inset";
import { getTodayYyyyMmDd } from "@/lib/session-date";

export type ExerciseFiltersPatch = Partial<{ from: string; to: string; hideWarmups: boolean }>;

type ExerciseFiltersSectionProps = {
  shownCount: number;
  totalCount: number;
  from: string;
  to: string;
  hideWarmups: boolean;
  hasWarmupSets: boolean;
  isFullyCleared: boolean;
  clearRange: { from: string; to: string };
  onCommit: (patch: ExerciseFiltersPatch) => void;
};

export function ExerciseFiltersSection({
  shownCount,
  totalCount,
  from,
  to,
  hideWarmups,
  hasWarmupSets,
  isFullyCleared,
  clearRange,
  onCommit,
}: ExerciseFiltersSectionProps) {
  return (
    <div className={panelInsetClass("flex flex-col gap-3 p-3 sm:p-4")}>
      <p className="text-xs text-zinc-600">
        Showing <span className="font-medium text-zinc-800">{shownCount}</span> of{" "}
        <span className="font-medium text-zinc-800">{totalCount}</span> sets
      </p>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0 text-xs font-medium text-zinc-600">
            From
            <DateInput
              value={from}
              onChange={(event) => onCommit({ from: event.target.value })}
              max={getTodayYyyyMmDd()}
              className="mt-1 min-w-0 w-full max-w-full rounded-md border bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block min-w-0 text-xs font-medium text-zinc-600">
            To
            <DateInput
              value={to}
              onChange={(event) => onCommit({ to: event.target.value })}
              max={getTodayYyyyMmDd()}
              className="mt-1 min-w-0 w-full max-w-full rounded-md border bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {hasWarmupSets ? (
            <Checkbox
              checked={hideWarmups}
              onChange={(checked) => onCommit({ hideWarmups: checked })}
              className="min-w-0"
            >
              Hide warmups
            </Checkbox>
          ) : null}
          <ActionButton
            type="button"
            onClick={() =>
              onCommit({
                from: clearRange.from,
                to: clearRange.to,
                hideWarmups: false,
              })
            }
            disabled={isFullyCleared}
            variant="secondary"
            size="sm"
            className="ml-auto shrink-0 text-sm font-normal text-amber-800 hover:text-amber-900"
            iconColor="amber"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear filters
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
