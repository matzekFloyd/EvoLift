import { NextRequest } from "next/server";
import { handleApi, jsonData } from "@/server/api/http";
import { buildInsightsPayload, parseInsightsQuery } from "@/server/api/insights-response";
import { loadInsightsHistory, loadUserStrengthProfile } from "@/lib/insights-data";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const today = new Date();
    const query = parseInsightsQuery(request.nextUrl.searchParams, today);
    const [history, profile] = await Promise.all([
      loadInsightsHistory(auth.client, auth.userId, { from: query.from, to: query.to }),
      loadUserStrengthProfile(auth.client, auth.userId),
    ]);
    return jsonData(buildInsightsPayload({ query, today, history, profile }));
  });
}
