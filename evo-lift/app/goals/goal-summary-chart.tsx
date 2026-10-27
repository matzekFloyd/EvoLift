import { PanelInset } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusBadge } from "@/app/components/status-badge";
import { goalMeterValueText, goalMeterVisible } from "@/app/goals/goal-meter";
import { GoalProgressMeter } from "@/app/goals/goal-progress-meter";
import { goalStatusMark } from "@/app/goals/goal-status";
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
          const mark = goalStatusMark({ pastDue: bar.pastDue, achieved: bar.achieved });
          const showMeter = goalMeterVisible({ percent: bar.percent, achieved: bar.achieved });
          return (
            <li key={bar.id}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="min-w-[10rem] flex-1 truncate text-sm font-medium text-zinc-900">{bar.label}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {bar.percent == null ? <p className="text-sm text-zinc-700">Needs bodyweight</p> : null}
                  {mark ? (
                    <StatusBadge tone={mark.tone} description={mark.description}>
                      {mark.label}
                    </StatusBadge>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-zinc-800">{bar.targetLabel}</p>
              {showMeter ? (
                <GoalProgressMeter
                  percent={bar.percent}
                  label={`${bar.label}, ${bar.targetLabel}`}
                  valueText={goalMeterValueText({
                    percent: bar.percent,
                    pastDue: bar.pastDue,
                    achieved: bar.achieved,
                  })}
                />
              ) : null}
            </li>
          );
        })}
      </PanelInset>
    </div>
  );
}
