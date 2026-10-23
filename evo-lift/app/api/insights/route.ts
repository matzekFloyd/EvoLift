import { NextRequest } from "next/server";
import { handleApi, jsonData } from "@/server/api/http";
import { buildInsightsPayload, parseInsightsQuery } from "@/server/api/insights-response";
import { loadInsightsHistory, loadUserStrengthProfile } from "@/lib/insights-data";
import { listHiddenExerciseIds } from "@/server/db/profile";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const today = new Date();
    const query = parseInsightsQuery(request.nextUrl.searchParams, today);
    const [history, profile, hiddenExerciseIds] = await Promise.all([
      loadInsightsHistory(auth.client, auth.userId, { from: query.from, to: query.to }),
      loadUserStrengthProfile(auth.client, auth.userId),
      listHiddenExerciseIds(auth.client, auth.userId),
    ]);
    return jsonData(
      buildInsightsPayload({
        query,
        today,
        history,
        profile,
        hiddenExerciseIds: new Set(hiddenExerciseIds),
      }),
    );
  });
}
