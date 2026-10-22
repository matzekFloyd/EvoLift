"use client";

import dynamic from "next/dynamic";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  CONTENT_PLACEHOLDER_SURFACE_CLASS,
  EXERCISE_CHART_HEIGHT_CLASS,
  INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS,
} from "@/app/components/content-placeholder-layout";

function chartPlaceholder(rowClassName: string) {
  return function ChartPlaceholder() {
    return <ContentPlaceholder rowClassName={rowClassName} />;
  };
}

function PaceChartPlaceholder() {
  return (
    <div className={`${CONTENT_PLACEHOLDER_SURFACE_CLASS} h-24 w-24`} aria-hidden />
  );
}

/**
 * Chart modules pull in Recharts. Load them from the screen that renders the
 * chart so Home, Insights, and an exercise page do not put that library in a
 * shared chunk other routes download.
 */
export const WorkoutActivityChart = dynamic(
  () => import("@/app/components/workout-activity-chart").then((mod) => mod.WorkoutActivityChart),
  { loading: chartPlaceholder("h-36 w-full") },
);

export const InsightsWeeklyVolumeChart = dynamic(
  () =>
    import("@/app/components/insights-weekly-volume-chart").then(
      (mod) => mod.InsightsWeeklyVolumeChart,
    ),
  { loading: chartPlaceholder(INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS) },
);

export const InsightsCompoundE1rmChart = dynamic(
  () =>
    import("@/app/components/insights-compound-e1rm-chart").then(
      (mod) => mod.InsightsCompoundE1rmChart,
    ),
  { loading: chartPlaceholder("h-36 w-full sm:h-40") },
);

export const ExerciseProgressPaceChart = dynamic(
  () =>
    import("@/app/components/exercise-progress-pace-chart").then(
      (mod) => mod.ExerciseProgressPaceChart,
    ),
  { loading: () => <PaceChartPlaceholder /> },
);

export const ExerciseWeightProgressChart = dynamic(
  () =>
    import("@/app/components/exercise-weight-progress-chart").then(
      (mod) => mod.ExerciseWeightProgressChart,
    ),
  { loading: chartPlaceholder(EXERCISE_CHART_HEIGHT_CLASS) },
);

export const ExerciseSessionE1rmChart = dynamic(
  () =>
    import("@/app/components/exercise-session-e1rm-chart").then(
      (mod) => mod.ExerciseSessionE1rmChart,
    ),
  { loading: chartPlaceholder(EXERCISE_CHART_HEIGHT_CLASS) },
);

export const ExerciseSessionVolumeChart = dynamic(
  () =>
    import("@/app/components/exercise-session-volume-chart").then(
      (mod) => mod.ExerciseSessionVolumeChart,
    ),
  { loading: chartPlaceholder(EXERCISE_CHART_HEIGHT_CLASS) },
);
