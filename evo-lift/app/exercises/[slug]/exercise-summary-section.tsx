import { Hash, TrendingUp, Weight } from "lucide-react";
import { KpiBadge } from "@/app/components/kpi-badge";
import { kpiBadgeTone } from "@/app/components/kpi-badge-tone";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import {
  formatKgValue,
  type ExerciseHistoryStats,
} from "@/app/exercises/[slug]/exercise-history-display";
import {
  exerciseSummaryGridClassName,
  exerciseSummaryLoadCardClassName,
  exerciseSummarySetCardClassName,
} from "@/app/exercises/[slug]/exercise-summary-layout";

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
      <section
        className={panelInsetClass("p-4 sm:p-5")}
        aria-labelledby="exercise-detail-summary-heading"
      >
        <SectionHeading id="exercise-detail-summary-heading" className="mb-3">
          Summary
        </SectionHeading>
        <div className="@container">
          <div className={exerciseSummaryGridClassName(assistance)}>
            <KpiBadge
              label="Logged sets"
              value={String(loggedSetCount)}
              icon={<Hash className="h-4 w-4" />}
              tone={kpiBadgeTone("count")}
              className={exerciseSummarySetCardClassName}
              description="Sets in the current date range. Warmups are included unless “Hide warmups” is on."
            />
            <KpiBadge
              label="Avg sets"
              value={avgSetsText}
              icon={<Hash className="h-4 w-4" />}
              tone={kpiBadgeTone("count")}
              className={exerciseSummarySetCardClassName}
              description="Average sets per session within the current filters (respects date range and “Hide warmups”)."
            />
            <KpiBadge
              label="Max sets"
              value={maxSetsText}
              icon={<Hash className="h-4 w-4" />}
              tone={kpiBadgeTone("count")}
              className={exerciseSummarySetCardClassName}
              description="Most sets in one session within the current filters (respects date range and “Hide warmups”)."
            />
            <KpiBadge
              label={assistance ? "Avg assistance (kg)" : "Avg loaded (kg)"}
              value={averageLoadedText}
              icon={<Weight className="h-4 w-4" />}
              tone={kpiBadgeTone("strength")}
              className={exerciseSummaryLoadCardClassName(assistance)}
              description={
                assistance
                  ? "Average assistance on working sets (no warmups). Blank or 0 is unassisted bodyweight."
                  : "Average loaded weight on working sets (no warmups). Only sets where you logged a weight."
              }
            />
            <KpiBadge
              label={assistance ? "Least assistance (kg)" : "Max loaded (kg)"}
              value={maxLoadedText}
              icon={<Weight className="h-4 w-4" />}
              tone={kpiBadgeTone("strength")}
              className={exerciseSummaryLoadCardClassName(assistance)}
              description={
                assistance
                  ? "Lowest assistance on a working set (no warmups), including 0 kg. 0 kg is unassisted bodyweight."
                  : "Heaviest single working set by loaded weight (no warmups). Only sets with logged weight."
              }
            />
            {assistance ? null : (
              <>
                <KpiBadge
                  label="Avg total (kg)"
                  value={averageTotalText}
                  icon={<TrendingUp className="h-4 w-4" />}
                  tone={kpiBadgeTone("strength")}
                  className={exerciseSummaryLoadCardClassName(assistance)}
                  description="Mean of each working set’s Total (kg)—loaded plus base for that session—same column as in set history. No warmups; only sets with logged load."
                />
                <KpiBadge
                  label="Max total (kg)"
                  value={maxTotalText}
                  icon={<TrendingUp className="h-4 w-4" />}
                  tone={kpiBadgeTone("strength")}
                  className={exerciseSummaryLoadCardClassName(assistance)}
                  description="Heaviest single working set by Total (kg) in set history (loaded plus base). No warmups; only sets with logged load."
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
