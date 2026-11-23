import { appPath } from "@/lib/app-paths";
import type { InsightsRange } from "@/lib/insights-data";
import { OVERALL_LEVEL_RECENT_DAYS } from "@/lib/overall-level-detail";
import { getDefaultDateRange } from "@/lib/session-date";

function toYyyyMmDd(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Insights date presets. `all` leaves the start open and ends today. */
export function getInsightsPresetRange(range: InsightsRange, today: Date): { from: string; to: string } {
  if (range === "12w") {
    return getDefaultDateRange(today);
  }
  const to = toYyyyMmDd(today);
  const fromDate = new Date(today);
  if (range === "4w") {
    fromDate.setDate(fromDate.getDate() - 27);
    return { from: toYyyyMmDd(fromDate), to };
  }
  if (range === "6m") {
    fromDate.setMonth(fromDate.getMonth() - 6);
    return { from: toYyyyMmDd(fromDate), to };
  }
  return { from: "", to };
}

/** Hash on Insights that opens Lift comparison. */
export const INSIGHTS_LEVEL_DETAILS_HASH = "#overall-level";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isCalendarDate(value: string | null): value is string {
  if (value == null || !CALENDAR_DATE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** The overall-level window: 56 days back through today. This is not a preset chip. */
export function insightsLevelWindow(today: string): { from: string; to: string } {
  return { from: shiftIsoDate(today, -OVERALL_LEVEL_RECENT_DAYS), to: today };
}

/** Profile opens Lift comparison on that window, with From and To filled in. */
export function insightsLevelDetailsHref(today: string): string {
  const { from, to } = insightsLevelWindow(today);
  const params = new URLSearchParams({ from, to });
  return `${appPath("/insights")}?${params.toString()}${INSIGHTS_LEVEL_DETAILS_HASH}`;
}

/** True when Profile's Level details link asked Insights to open Lift comparison. */
export function insightsLevelDetailsRequested(hash: string): boolean {
  return hash === INSIGHTS_LEVEL_DETAILS_HASH;
}

/** `all` when the query asks for every session. Anything else keeps the Insights default. */
export function insightsOpeningRange(range: string | null): InsightsRange {
  return range === "all" ? "all" : "12w";
}

/**
 * Explicit From and To win, so Level details can open the 8-week window without a preset.
 * A missing or invalid pair falls back to the range query, then to 12 weeks.
 */
export function insightsOpeningDates(
  query: { range: string | null; from: string | null; to: string | null },
  today: Date,
): { from: string; to: string } {
  if (isCalendarDate(query.from) && isCalendarDate(query.to)) {
    return { from: query.from, to: query.to };
  }
  return getInsightsPresetRange(insightsOpeningRange(query.range), today);
}
