import type { WeeklyVolumePoint } from "@/lib/insights-data";

type InsightTrendMetric = "volume" | "workingSets";

function parseDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function toYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toYyyyMmDd(date);
}

function inclusiveDayCount(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

function metricValue(point: WeeklyVolumePoint, metric: InsightTrendMetric): number {
  return metric === "volume" ? point.volumeKg : point.workingSets;
}

function sumMetric(points: WeeklyVolumePoint[], metric: InsightTrendMetric): number {
  return points.reduce((sum, point) => sum + metricValue(point, metric), 0);
}

function formatKg(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function formatCount(value: number, noun: string): string {
  const rounded = Math.round(value);
  return `${rounded} ${noun}${rounded === 1 ? "" : "s"}`;
}

function formatCurrent(value: number, metric: InsightTrendMetric): string {
  if (metric === "volume") {
    return formatKg(value);
  }
  return formatCount(value, "working set");
}

function changeClause(current: number, previous: number, metric: InsightTrendMetric, comparedWith: string): string {
  const delta = current - previous;
  const unchanged = metric === "volume" ? Math.abs(delta) < 0.05 : Math.abs(delta) < 0.5;
  if (unchanged) {
    return `the same as ${comparedWith}`;
  }
  if (metric === "volume" && previous > 0) {
    const percent = Math.round((Math.abs(delta) / previous) * 100);
    if (percent >= 1) {
      return `${percent}% ${delta > 0 ? "more" : "less"} than ${comparedWith}`;
    }
  }
  if (metric === "volume") {
    return `${formatKg(Math.abs(delta))} ${delta > 0 ? "more" : "less"} than ${comparedWith}`;
  }
  const amount = Math.abs(Math.round(delta));
  const noun = amount === 1 ? "working set" : "working sets";
  return `${amount} ${delta > 0 ? "more" : "fewer"} ${noun} than ${comparedWith}`;
}

/**
 * Compare the selected window with the previous window of the same length.
 * When the range is open-ended, compare the latest week with the week before it.
 * `periodName` is a span such as "12 weeks" when the dates still match a preset.
 */
export function buildInsightsComparisonSentence(options: {
  metric: InsightTrendMetric;
  currentWeeks: WeeklyVolumePoint[];
  allWeeks: WeeklyVolumePoint[];
  dateFrom: string;
  dateTo: string;
  periodName: string | null;
}): string {
  const { metric, currentWeeks, allWeeks, dateFrom, dateTo, periodName } = options;
  if (currentWeeks.length === 0) {
    return "";
  }

  const currentSum = sumMetric(currentWeeks, metric);
  const currentText = formatCurrent(currentSum, metric);

  if (dateFrom && dateTo && dateFrom <= dateTo) {
    const length = inclusiveDayCount(dateFrom, dateTo);
    const previousTo = addDays(dateFrom, -1);
    const previousFrom = addDays(previousTo, -(length - 1));
    const previousWeeks = allWeeks.filter(
      (week) => week.weekStart >= previousFrom && week.weekStart <= previousTo,
    );
    const comparedWith = periodName ? `the previous ${periodName}` : "the previous period";
    if (previousWeeks.length === 0) {
      return `${currentText} in this range. No earlier period to compare.`;
    }
    const previousSum = sumMetric(previousWeeks, metric);
    return `${currentText} in this range, ${changeClause(currentSum, previousSum, metric, comparedWith)}.`;
  }

  const latest = currentWeeks[currentWeeks.length - 1];
  const latestText = formatCurrent(metricValue(latest, metric), metric);
  if (currentWeeks.length < 2) {
    return `Latest week is ${latestText}. No earlier week to compare.`;
  }
  const prior = currentWeeks[currentWeeks.length - 2];
  const priorLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    parseDate(prior.weekStart),
  );
  return `Latest week is ${latestText}, ${changeClause(metricValue(latest, metric), metricValue(prior, metric), metric, `the week of ${priorLabel}`)}.`;
}
