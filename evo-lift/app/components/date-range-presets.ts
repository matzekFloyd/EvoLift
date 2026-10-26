import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import type { InsightsRange } from "@/lib/insights-data";

export const dateRangePresetOptions: ReadonlyArray<{ value: InsightsRange; label: string }> = [
  { value: "4w", label: "4w" },
  { value: "12w", label: "12w" },
  { value: "6m", label: "6m" },
  { value: "all", label: "All" },
];

/** Past workouts and exercise detail open on the same 12-week window as Insights. */
export function openingDateRange(today: Date): { from: string; to: string } {
  return getInsightsPresetRange("12w", today);
}

/**
 * Past workouts All clears both fields. Empty bounds include every completed session
 * in the chart and the session list.
 */
export const pastWorkoutsAllDateRange = { from: "", to: "" };

/**
 * 4w, 12w, and 6m use the Insights dates. All uses the screen’s own span
 * (every session, or every set for one exercise).
 */
export function applyDateRangePreset(
  range: InsightsRange,
  today: Date,
  allRange: { from: string; to: string },
): { from: string; to: string } {
  if (range === "all") {
    return { from: allRange.from, to: allRange.to };
  }
  return getInsightsPresetRange(range, today);
}

/**
 * The preset whose From and To match. A hand-typed range matches none.
 * When the full span equals 4w, 12w, or 6m, that preset is marked.
 */
export function markedDateRangePreset(
  from: string,
  to: string,
  today: Date,
  allRange: { from: string; to: string },
): InsightsRange | null {
  for (const range of ["4w", "12w", "6m"] as const) {
    const preset = getInsightsPresetRange(range, today);
    if (from === preset.from && to === preset.to) {
      return range;
    }
  }
  if (from === allRange.from && to === allRange.to) {
    return "all";
  }
  return null;
}
