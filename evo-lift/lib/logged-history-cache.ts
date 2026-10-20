import { invalidateHomeSessionSummaries } from "@/lib/home-session-cache";
import { invalidateInsightsHistory } from "@/lib/insights-data";
import { invalidateOpenedExerciseHistories } from "@/lib/opened-exercise-history-cache";
import { invalidateOpenedSessions } from "@/lib/opened-session-cache";

/** Drop remembered Home, Insights, and opened session pages after a workout change or sign-out. */
export function invalidateLoggedHistoryCaches() {
  invalidateHomeSessionSummaries();
  invalidateInsightsHistory();
  invalidateOpenedSessions();
  invalidateOpenedExerciseHistories();
}
