import { MuscleAreaCoverageLayout, MuscleAreaCoverageRow } from "@/app/components/muscle-area-coverage-row";
import { MuscleAreaCoverageBodies } from "@/app/components/muscle-area-figure";
import { PanelInset } from "@/app/components/panel-inset";
import {
  muscleAreaRangeBarPercent,
  type MuscleAreaRangeCoverage,
} from "@/lib/muscle-area-range-coverage";

/** Always-visible muscle-area coverage for the Insights summary, beside the range totals. */
export function MuscleAreaInsightsSection({
  coverage,
  className,
}: {
  coverage: MuscleAreaRangeCoverage;
  className?: string;
}) {
  return (
    <PanelInset as="section" aria-label="Muscle areas" className={["p-3", className].filter(Boolean).join(" ")}>
      <MuscleAreaCoverageLayout
        className=""
        areas={coverage.areas}
        figure={
          <MuscleAreaCoverageBodies
            areas={coverage.areas}
            legend={{ primary: "Volume", secondary: "Trained", missing: "Not trained" }}
          />
        }
        renderArea={(area) => (
          <MuscleAreaCoverageRow
            key={area.area}
            label={area.label}
            valueText={area.valueText}
            emphasized={area.mark === "primary"}
            barPercent={
              area.mark === "primary" ? muscleAreaRangeBarPercent(area.volumeKg, coverage.totalVolumeKg) : 0
            }
          />
        )}
      />
    </PanelInset>
  );
}
