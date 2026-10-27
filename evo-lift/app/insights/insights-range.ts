import { markedDateRangePreset } from "@/app/components/date-range-presets";
import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import type { InsightsRange } from "@/lib/insights-data";

/** Which shared preset matches the Insights From and To fields. A hand-typed range matches none. */
export function insightsMarkedRange(from: string, to: string, today: Date): InsightsRange | null {
  return markedDateRangePreset(from, to, today, getInsightsPresetRange("all", today));
}

/** Period name for the comparison sentence. Only an exact 4w, 12w, or 6m window has one. */
export function insightsComparisonPeriodName(from: string, to: string, today: Date): string | null {
  const marked = insightsMarkedRange(from, to, today);
  if (marked === "4w") {
    return "4 weeks";
  }
  if (marked === "12w") {
    return "12 weeks";
  }
  if (marked === "6m") {
    return "6 months";
  }
  return null;
}

/** Clear filters is already done when the window is open, including All (start open, end today). */
export function insightsClearFiltersDisabled(from: string, to: string, today: Date): boolean {
  if (from === "" && to === "") {
    return true;
  }
  const all = getInsightsPresetRange("all", today);
  return from === all.from && to === all.to;
}
