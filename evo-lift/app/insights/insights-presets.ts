import type { InsightsRange } from "@/lib/insights-data";
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
