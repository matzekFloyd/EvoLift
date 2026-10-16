import { NextRequest } from "next/server";
import { summarizeExerciseHistory } from "@/app/exercises/[slug]/exercise-history-display";
import { sortExerciseHistoryRowsCanonical } from "@/app/exercises/[slug]/exercise-history";
import { ApiHttpError, handleApi, jsonData, readRouteParams } from "@/server/api/http";
import { parseHistoryQuery } from "@/server/api/insights-response";
import { loadExerciseHistory } from "@/server/db/exercise-history";

type HistoryParams = { slug: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<HistoryParams> | HistoryParams },
) {
  return handleApi(request, async (auth) => {
    const { slug } = await readRouteParams(context.params);
    const loaded = await loadExerciseHistory(auth.client, auth.userId, slug);
    if (!loaded) {
      throw new ApiHttpError(404, "Exercise not found.");
    }
    const query = parseHistoryQuery(request.nextUrl.searchParams, new Date());
    const inRange = loaded.sets.filter((row) => {
      if (query.from && row.performedOn < query.from) {
        return false;
      }
      if (query.to && row.performedOn > query.to) {
        return false;
      }
      if (query.hideWarmups && row.isWarmup) {
        return false;
      }
      return true;
    });
    const ordered = sortExerciseHistoryRowsCanonical(inRange);
    const stats = summarizeExerciseHistory(ordered);
    return jsonData({
      exercise: { id: loaded.id, slug: loaded.slug, name: loaded.name },
      from: query.from,
      to: query.to,
      hide_warmups: query.hideWarmups,
      stats: {
        set_count: stats.setCount,
        avg_sets_per_session: stats.avgSetsPerSession,
        max_sets_in_session: stats.maxSetsInSession,
        avg_loaded_kg: stats.avgLoadedKg,
        best_loaded_kg: stats.bestLoadedKg,
        avg_total_kg: stats.avgTotalKg,
        best_total_kg: stats.bestTotalKg,
      },
      sets: ordered.map((row) => ({
        session_id: row.sessionId,
        performed_on: row.performedOn,
        set_number: row.setNumber,
        reps: row.reps,
        weight_kg: row.weightKg,
        total_kg: row.totalKg,
        is_warmup: row.isWarmup,
        goal_label: row.goalLabel,
      })),
    });
  });
}
