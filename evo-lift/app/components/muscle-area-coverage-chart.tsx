import { MuscleAreaCoverageLayout, MuscleAreaCoverageRow } from "@/app/components/muscle-area-coverage-row";
import { MuscleAreaCoverageBodies } from "@/app/components/muscle-area-figure";
import {
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

/** One coverage figure for every exercise row in a plan or a template. */
export function MuscleAreaCoverageChart({
  scope,
  rows,
  exerciseOptions,
}: MuscleAreaCoverageChartProps) {
  const coverage = muscleAreaCoverage(exerciseRowSlugs(rows, exerciseOptions));
  const maxPrimary = coverage.areas.reduce((max, area) => Math.max(max, area.primaryCount), 0);

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-3">
      <h2 className="text-sm font-medium text-zinc-900">Muscle areas</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {muscleAreaCoverageSummary(scope, coverage.includedCount)}
      </p>
      <MuscleAreaCoverageLayout
        areas={coverage.areas}
        figure={<MuscleAreaCoverageBodies areas={coverage.areas} />}
        renderArea={(area) => (
          <MuscleAreaCoverageRow
            key={area.area}
            label={area.label}
            valueText={area.valueText}
            emphasized={area.mark === "primary"}
            barPercent={
              area.mark === "primary" && maxPrimary > 0 ? (area.primaryCount / maxPrimary) * 100 : 0
            }
          />
        )}
      />
    </section>
  );
}
