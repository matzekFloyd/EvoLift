import { MuscleAreaCoverageBodies } from "@/app/components/muscle-area-figure";
import {
  exerciseRowSlugs,
  muscleAreaCoverage,
  muscleAreaCoverageSummary,
  type MuscleAreaCoverageArea,
  type MuscleAreaCoverageScope,
} from "@/lib/muscle-area-coverage";

type MuscleAreaCoverageChartProps = {
  scope: MuscleAreaCoverageScope;
  rows: readonly { exerciseId: string }[];
  exerciseOptions: readonly { id: string; slug: string }[];
};

function CoverageCount({
  area,
  maxPrimary,
}: {
  area: MuscleAreaCoverageArea;
  maxPrimary: number;
}) {
  const primary = area.mark === "primary";
  const share = primary && maxPrimary > 0 ? (area.primaryCount / maxPrimary) * 100 : 0;
  return (
    <li className="grid grid-cols-[7.25rem_minmax(0,1fr)_5.75rem] items-center gap-x-2 border-b border-zinc-200 py-1.5">
      <span className="text-sm text-zinc-800">{area.label}</span>
      <span className="h-1.5 overflow-hidden rounded-sm bg-zinc-100" aria-hidden>
        {share > 0 ? (
          <span className="block h-full rounded-sm bg-sky-600" style={{ width: `${share}%` }} />
        ) : null}
      </span>
      <span
        className={
          primary
            ? "text-right text-lg font-medium tabular-nums leading-none text-sky-800"
            : "text-right text-sm text-zinc-500"
        }
      >
        {area.valueText}
      </span>
    </li>
  );
}

/** One coverage figure for every exercise row in a plan or a template. */
export function MuscleAreaCoverageChart({
  scope,
  rows,
  exerciseOptions,
}: MuscleAreaCoverageChartProps) {
  const coverage = muscleAreaCoverage(exerciseRowSlugs(rows, exerciseOptions));
  const midpoint = Math.ceil(coverage.areas.length / 2);
  const columns = [coverage.areas.slice(0, midpoint), coverage.areas.slice(midpoint)];
  const maxPrimary = coverage.areas.reduce((max, area) => Math.max(max, area.primaryCount), 0);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-3">
      <h2 className="text-sm font-medium text-zinc-900">Muscle areas</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {muscleAreaCoverageSummary(scope, coverage.includedCount)}
      </p>
      <div className="mt-3 grid items-center gap-x-8 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <MuscleAreaCoverageBodies areas={coverage.areas} />
        <div className="grid grid-cols-1 gap-x-8 min-[36rem]:grid-cols-2">
          {columns.map((column) => (
            <ul key={column[0]?.area ?? "coverage"}>
              {column.map((area) => (
                <CoverageCount key={area.area} area={area} maxPrimary={maxPrimary} />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
