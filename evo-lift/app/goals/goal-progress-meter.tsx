import { goalMeterWidth } from "@/app/goals/goal-meter";

type GoalProgressMeterProps = {
  percent: number | null;
  /** Accessible name of the goal, without the status sentence. */
  label: string;
  valueText: string;
};

/**
 * The progress list’s one track. Sky is the strength series.
 * Reached and past due stay on the badge, so the track does not turn the list green or amber.
 */
export function GoalProgressMeter({ percent, label, valueText }: GoalProgressMeterProps) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={valueText}
      >
        <div className="h-full bg-sky-600" style={{ width: `${goalMeterWidth(percent)}%` }} />
      </div>
      {percent != null ? (
        <span className="shrink-0 text-right text-sm font-medium tabular-nums text-zinc-900">
          {percent}%
        </span>
      ) : null}
    </div>
  );
}
