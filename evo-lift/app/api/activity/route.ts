import { NextRequest } from "next/server";
import { homeExerciseBadges, homeSetCount } from "@/app/home-sessions";
import { loadGoalReachedSessionDates } from "@/lib/goal-reached-dates";
import { handleApi, jsonData } from "@/server/api/http";
import { parseActivityQuery } from "@/server/api/insights-response";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const { from, to } = parseActivityQuery(request.nextUrl.searchParams);
    let sessionQuery = auth.client
      .from("home_session_summaries")
      .select("id, performed_on, notes, created_at, started_at, completed_at, set_count, exercise_badges")
      .eq("user_id", auth.userId)
      .order("performed_on", { ascending: false });
    if (from) {
      sessionQuery = sessionQuery.gte("performed_on", from);
    }
    if (to) {
      sessionQuery = sessionQuery.lte("performed_on", to);
    }
    const { data, error } = await sessionQuery;
    if (error) {
      throw new Error("Could not load workout sessions.");
    }
    const goalDates = await loadGoalReachedSessionDates(auth.client, auth.userId);
    const goalReachedOn = Object.fromEntries(
      Object.entries(goalDates).filter(([date]) => {
        if (from && date < from) {
          return false;
        }
        if (to && date > to) {
          return false;
        }
        return true;
      }),
    );
    return jsonData({
      sessions: (data ?? []).map((row) => ({
        id: row.id,
        performed_on: row.performed_on.slice(0, 10),
        notes: row.notes,
        created_at: row.created_at,
        set_count: homeSetCount(row.set_count),
        exercises: homeExerciseBadges(row.exercise_badges),
      })),
      goal_reached_on: goalReachedOn,
    });
  });
}
