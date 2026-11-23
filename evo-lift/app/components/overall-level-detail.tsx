import { OverallLevelHistoryChart } from "@/app/components/chart-dynamic";
import { overallLevelHistoryChart } from "@/app/components/overall-level-history-series";
import { OverallLevelProgressBar, OverallLevelProgressExplanation } from "@/app/components/overall-level-progress-bar";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";

type OverallLevelDetailProps = {
  level: OverallLifterLevel;
};

export function OverallLevelDetail({ level }: OverallLevelDetailProps) {
  const history = overallLevelHistoryChart(level.history, { through: level.asOf });
  return (
    <div className="mt-3 space-y-3">
      <OverallLevelProgressBar progress={level.progress} />
      <OverallLevelProgressExplanation badge={level.badge} progress={level.progress} lifts={level.lifts} />
      {history ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Evolution</h3>
          <OverallLevelHistoryChart model={history} />
        </div>
      ) : null}
    </div>
  );
}
