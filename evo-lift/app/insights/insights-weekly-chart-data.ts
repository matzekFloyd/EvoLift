import type { WeeklyVolumePoint } from "@/lib/insights-data";

export type InsightsTrendMetric = "volume" | "workingSets" | "sessions";

export type InsightsWeeklyChartPoint = WeeklyVolumePoint & {
  movingAverage: number | null;
};

function metricSource(item: WeeklyVolumePoint, metric: InsightsTrendMetric): number {
  if (metric === "volume") {
    return item.volumeKg;
  }
  if (metric === "workingSets") {
    return item.workingSets;
  }
  return item.sessionCount;
}

export function withWeeklyMovingAverage(
  weeks: readonly WeeklyVolumePoint[],
  metric: InsightsTrendMetric,
): InsightsWeeklyChartPoint[] {
  return weeks.map((item, index) => {
    if (index < 3) {
      return { ...item, movingAverage: null };
    }
    const window = weeks.slice(index - 3, index + 1);
    const average = window.reduce((sum, row) => sum + metricSource(row, metric), 0) / window.length;
    return { ...item, movingAverage: Number(average.toFixed(2)) };
  });
}
