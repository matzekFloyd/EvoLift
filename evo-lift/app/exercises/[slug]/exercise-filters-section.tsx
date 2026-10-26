import { FilterX } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { Checkbox } from "@/app/components/checkbox";
import { DateRangeFields } from "@/app/components/date-range-fields";
import { applyDateRangePreset, markedDateRangePreset } from "@/app/components/date-range-presets";
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
  /** Same calendar day used for the 12-week opening range, so a preset matches those dates. */
  presetToday: Date;
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
  presetToday,
  onCommit,
}: ExerciseFiltersSectionProps) {
  return (
    <div className={panelInsetClass("flex flex-col gap-3 p-3 sm:p-4")}>
      <p className="text-xs text-zinc-600">
        Showing <span className="font-medium text-zinc-800">{shownCount}</span> of{" "}
        <span className="font-medium text-zinc-800">{totalCount}</span> sets
      </p>
      <div className="flex flex-col gap-2">
        <DateRangeFields
          from={from}
          to={to}
          max={getTodayYyyyMmDd()}
          marked={markedDateRangePreset(from, to, presetToday, clearRange)}
          onFromChange={(value) => onCommit({ from: value })}
          onToChange={(value) => onCommit({ to: value })}
          onSelectRange={(range) => {
            const next = applyDateRangePreset(range, presetToday, clearRange);
            onCommit({ from: next.from, to: next.to });
          }}
        />
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
