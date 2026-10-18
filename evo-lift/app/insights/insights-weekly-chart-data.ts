import type { WeeklyVolumePoint } from "@/lib/insights-data";

export type InsightsTrendMetric = "volume" | "workingSets";

export type InsightsWeeklyChartPoint = WeeklyVolumePoint & {
  movingAverage: number | null;
};

export function withWeeklyMovingAverage(
  weeks: readonly WeeklyVolumePoint[],
  metric: InsightsTrendMetric,
): InsightsWeeklyChartPoint[] {
  const source = (item: WeeklyVolumePoint) =>
    metric === "volume" ? item.volumeKg : item.workingSets;
  return weeks.map((item, index) => {
    if (index < 3) {
      return { ...item, movingAverage: null };
    }
    const window = weeks.slice(index - 3, index + 1);
    const average = window.reduce((sum, row) => sum + source(row), 0) / window.length;
    return { ...item, movingAverage: Number(average.toFixed(2)) };
  });
}
