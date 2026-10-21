import { Hash, TrendingUp, Weight } from "lucide-react";
import { KpiBadge } from "@/app/components/kpi-badge";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import {
  formatKgValue,
  type ExerciseHistoryStats,
} from "@/app/exercises/[slug]/exercise-history-display";

type ExerciseSummarySectionProps = {
  loggedSetCount: number;
  stats: ExerciseHistoryStats;
  assistance: boolean;
};

export function ExerciseSummarySection({
  loggedSetCount,
  stats,
  assistance,
}: ExerciseSummarySectionProps) {
  const avgSetsText = stats.avgSetsPerSession == null ? "—" : stats.avgSetsPerSession.toFixed(1);
  const maxSetsText = stats.maxSetsInSession == null ? "—" : String(stats.maxSetsInSession);
  const maxLoadedText = formatKgValue(stats.bestLoadedKg, 1);
  const maxTotalText = formatKgValue(stats.bestTotalKg, 1);
  const averageLoadedText = formatKgValue(stats.avgLoadedKg, 1);
  const averageTotalText = formatKgValue(stats.avgTotalKg, 1);

  return (
    <>
      {/*
        Narrow: 3–2–2 rows (6-col grid). Mid: neutral row + load/total row (12-col). Wide: one row (7-col).
      */}
      <section
        className={panelInsetClass("p-4 sm:p-5")}
        aria-labelledby="exercise-detail-summary-heading"
      >
        <SectionHeading id="exercise-detail-summary-heading" className="mb-3">
          Summary
        </SectionHeading>
        <div className="@container">
          <div className="grid w-full grid-cols-6 gap-2 @min-[28rem]:grid-cols-12 @min-[56rem]:grid-cols-7">
            <KpiBadge
              label="Logged sets"
              value={String(loggedSetCount)}
              icon={<Hash className="h-4 w-4 text-zinc-600" />}
              tone="neutral"
              className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
              description="Sets in the current date range. Warmups are included unless “Hide warmups” is on."
            />
            <KpiBadge
              label="Avg sets"
              value={avgSetsText}
              icon={<Hash className="h-4 w-4 text-zinc-600" />}
              tone="neutral"
              className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
              description="Average sets per session within the current filters (respects date range and “Hide warmups”)."
            />
            <KpiBadge
              label="Max sets"
              value={maxSetsText}
              icon={<Hash className="h-4 w-4 text-zinc-600" />}
              tone="neutral"
              className="col-span-2 min-w-0 @min-[28rem]:col-span-4 @min-[56rem]:col-span-1"
              description="Most sets in one session within the current filters (respects date range and “Hide warmups”)."
            />
            <KpiBadge
              label={assistance ? "Avg assistance (kg)" : "Avg loaded (kg)"}
              value={averageLoadedText}
              icon={<Weight className="h-4 w-4 text-sky-700" />}
              className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
              description={
                assistance
                  ? "Average assistance on working sets (no warmups). Blank or 0 is unassisted bodyweight."
                  : "Average loaded weight on working sets (no warmups). Only sets where you logged a weight."
              }
            />
            <KpiBadge
              label={assistance ? "Max assistance (kg)" : "Max loaded (kg)"}
              value={maxLoadedText}
              icon={<Weight className="h-4 w-4 text-emerald-700" />}
              className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
              description={
                assistance
                  ? "Highest assistance on a single working set (no warmups). Only sets with logged assistance."
                  : "Heaviest single working set by loaded weight (no warmups). Only sets with logged weight."
              }
              tone="success"
            />
            {assistance ? null : (
              <>
                <KpiBadge
                  label="Avg total (kg)"
                  value={averageTotalText}
                  icon={<TrendingUp className="h-4 w-4 text-sky-700" />}
                  className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                  description="Mean of each working set’s Total (kg)—loaded plus base for that session—same column as in set history. No warmups; only sets with logged load."
                />
                <KpiBadge
                  label="Max total (kg)"
                  value={maxTotalText}
                  icon={<TrendingUp className="h-4 w-4 text-emerald-700" />}
                  className="col-span-3 min-w-0 @min-[28rem]:col-span-3 @min-[56rem]:col-span-1"
                  description="Heaviest single working set by Total (kg) in set history (loaded plus base). No warmups; only sets with logged load."
                  tone="success"
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
