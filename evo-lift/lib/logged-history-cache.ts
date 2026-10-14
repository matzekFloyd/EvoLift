import { invalidateHomeSessionSummaries } from "@/lib/home-session-cache";
import { invalidateInsightsHistory } from "@/lib/insights-data";

/** Drop remembered Home and Insights data after a workout change or sign-out. */
export function invalidateLoggedHistoryCaches() {
  invalidateHomeSessionSummaries();
  invalidateInsightsHistory();
}
