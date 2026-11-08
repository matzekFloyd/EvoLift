"use client";

import dynamic from "next/dynamic";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import { EXERCISE_CHART_HEIGHT_CLASS } from "@/app/components/content-placeholder-layout";

/**
 * Chart headings and help text stay out of the exercise page first load.
 * The Charts tab mounts this view only after it is opened.
 */
export const ExerciseDetailCharts = dynamic(
  () =>
    import("@/app/exercises/[slug]/exercise-chart-sections").then(
      (mod) => mod.ExerciseDetailCharts,
    ),
  {
    ssr: false,
    loading: () => (
      <ContentPlaceholder
        rows={3}
        rowClassName={EXERCISE_CHART_HEIGHT_CLASS}
        label="Loading charts..."
      />
    ),
  },
);
