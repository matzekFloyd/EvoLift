import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import type { GoalSummaryBar } from "@/app/goals/goal-summary";

type GoalSummaryChartProps = {
  bars: GoalSummaryBar[];
};

export function GoalSummaryChart({ bars }: GoalSummaryChartProps) {
  if (bars.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <SectionHeading id="goal-summary-heading">Progress</SectionHeading>
      <PanelInset as="ul" className="mt-3 space-y-3 p-4" aria-labelledby="goal-summary-heading">
        {bars.map((bar) => {
          const percent = bar.percent ?? 0;
          const statusLabel =
            bar.percent == null ? "Needs bodyweight" : bar.pastDue ? `${bar.percent}% · Past due` : `${bar.percent}%`;
          return (
            <li key={bar.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-zinc-900">{bar.label}</p>
                {bar.percent == null ? (
                  <p className="shrink-0 text-sm text-zinc-700">Needs bodyweight</p>
                ) : bar.pastDue ? (
                  <p className="shrink-0 text-sm text-zinc-700">Past due</p>
                ) : null}
              </div>
              <p className="truncate text-xs text-zinc-500">{bar.targetLabel}</p>
              <div
                className="relative mt-1.5 h-6 overflow-hidden rounded-full bg-zinc-200"
                role="meter"
                aria-label={`${bar.label}, ${bar.targetLabel}, ${statusLabel}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={bar.percent == null ? undefined : percent}
                aria-valuetext={statusLabel}
              >
                <div
                  className={`h-full ${bar.achieved ? "bg-emerald-600" : "bg-sky-600"}`}
                  style={{ width: `${percent}%` }}
                />
                {bar.percent != null ? (
                  <span
                    aria-hidden
                    className={`absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums ${
                      percent >= 50 ? "text-white" : "text-zinc-800"
                    }`}
                  >
                    {bar.percent}%
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </PanelInset>
    </div>
  );
}
