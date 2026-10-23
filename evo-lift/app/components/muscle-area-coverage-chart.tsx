import {
  MUSCLE_AREA_COVERAGE_NOTE,
  exerciseRowSlugs,
  muscleAreaCoverage,
  muscleAreaCoverageSummary,
  type MuscleAreaCoverageScope,
} from "@/lib/muscle-area-coverage";

type MuscleAreaCoverageChartProps = {
  scope: MuscleAreaCoverageScope;
  rows: readonly { exerciseId: string }[];
  exerciseOptions: readonly { id: string; slug: string }[];
};

/** One coverage chart for every exercise row in a plan or a template. */
export function MuscleAreaCoverageChart({
  scope,
  rows,
  exerciseOptions,
}: MuscleAreaCoverageChartProps) {
  const coverage = muscleAreaCoverage(exerciseRowSlugs(rows, exerciseOptions));

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-3">
      <h2 className="text-sm font-medium text-zinc-900">Muscle areas</h2>
      <p className="mt-1 text-sm text-zinc-600">{muscleAreaCoverageSummary(scope, coverage.includedCount)}</p>
      <p className="mt-1 text-xs text-zinc-500">{MUSCLE_AREA_COVERAGE_NOTE}</p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {coverage.areas.map((area) => (
          <li
            key={area.area}
            className={`flex min-h-14 flex-col justify-between rounded-md border px-2 py-1.5 ${area.shadeClass}`}
          >
            <span className="text-xs font-medium leading-tight">{area.label}</span>
            <span className="mt-1 text-sm font-semibold leading-tight">{area.valueText}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
