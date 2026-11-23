import Link from "next/link";
import { OverallLevelProgressBar } from "@/app/components/overall-level-progress-bar";
import { appPath } from "@/lib/app-paths";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { overallLevelInfluenceLabel } from "@/lib/overall-level-detail";
import type { OverallLifterLevel } from "@/lib/exercise-progress-insights";

type OverallLevelDetailProps = {
  level: OverallLifterLevel;
};

export function OverallLevelDetail({ level }: OverallLevelDetailProps) {
  const history = level.history.slice(-12);
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
      {history.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">Level history</h3>
          <p className="mt-1 text-xs text-zinc-600">In this date range.</p>
          <ol className="mt-1 space-y-1 text-sm text-zinc-800">
            {history.map((point) => (
              <li key={`${point.asOf}-${point.badge}`}>
                {formatDateOnlyForLocale(point.asOf)} · {point.badge}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
