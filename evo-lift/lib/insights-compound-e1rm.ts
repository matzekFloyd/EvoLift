import {
  buildExerciseSessionE1rmChartPoints,
  type ExerciseSessionE1rmChartPoint,
} from "@/lib/exercise-session-e1rm-chart";
import type { ExerciseWorkingSetSample } from "@/lib/insights-data";

/** ExRx public-standard compounds, in display order for the Insights overview. */
export const INSIGHTS_COMPOUND_E1RM_LIFTS = [
  { slug: "back-squat", shortLabel: "Squat" },
  { slug: "barbell-bench-press", shortLabel: "Bench" },
  { slug: "deadlift", shortLabel: "Deadlift" },
  { slug: "overhead-press", shortLabel: "Press" },
] as const;

export type InsightsCompoundE1rmSeries = {
  slug: string;
  label: string;
  shortLabel: string;
  points: ExerciseSessionE1rmChartPoint[];
};

/**
 * Per-session estimated 1RM series for the four public-standard compounds.
 * Lifts with no qualifying sets in the sample list are omitted.
 */
export function buildInsightsCompoundE1rmSeries(
  samples: readonly ExerciseWorkingSetSample[],
): InsightsCompoundE1rmSeries[] {
  const series: InsightsCompoundE1rmSeries[] = [];

  for (const lift of INSIGHTS_COMPOUND_E1RM_LIFTS) {
    const liftSamples = samples.filter((sample) => sample.slug === lift.slug);
    if (liftSamples.length === 0) {
      continue;
    }
    const label = liftSamples[0]?.label ?? lift.shortLabel;
    const setNumberBySession = new Map<string, number>();
    const rows = liftSamples.map((sample) => {
      const next = (setNumberBySession.get(sample.sessionId) ?? 0) + 1;
      setNumberBySession.set(sample.sessionId, next);
      return {
        sessionId: sample.sessionId,
        performedOn: sample.performedOn,
        sessionCreatedAt: `${sample.performedOn}T12:00:00Z#${sample.sessionId}`,
        setNumber: next,
        reps: sample.reps,
        weightKg: sample.loadedKg,
        totalKg: sample.totalKg,
        isWarmup: false,
      };
    });
    const points = buildExerciseSessionE1rmChartPoints(rows);
    if (points.length === 0) {
      continue;
    }
    series.push({
      slug: lift.slug,
      label,
      shortLabel: lift.shortLabel,
      points,
    });
  }

  return series;
}
