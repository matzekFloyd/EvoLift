import Link from "next/link";
import { OverallLevelHistoryChart } from "@/app/components/chart-dynamic";
import { overallLevelHistoryChart } from "@/app/components/overall-level-history-series";
import { OverallLevelProgressBar } from "@/app/components/overall-level-progress-bar";
import { appPath } from "@/lib/app-paths";
import { overallLevelInfluenceLabel } from "@/lib/overall-level-detail";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";

type OverallLevelDetailProps = {
  level: OverallLifterLevel;
};

export function OverallLevelDetail({ level }: OverallLevelDetailProps) {
  const history = overallLevelHistoryChart(level.history, { through: level.asOf });
  return (
    <div className="mt-3 space-y-3">
      <OverallLevelProgressBar progress={level.progress} />
      {level.lifts.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Main lifts</h3>
          <ul className="mt-1 space-y-1 text-sm text-zinc-800">
            {level.lifts.map((lift) => (
              <li key={lift.slug} className="flex flex-wrap items-baseline gap-x-2">
                <Link
                  href={appPath(`/exercises/${lift.slug}`)}
                  className="font-medium text-sky-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                >
                  {lift.label}
                </Link>
                <span>{lift.level}</span>
                {lift.influence ? <span className="text-zinc-600">{overallLevelInfluenceLabel(lift.influence)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {history ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Evolution</h3>
          <OverallLevelHistoryChart model={history} />
        </div>
      ) : null}
    </div>
  );
}
