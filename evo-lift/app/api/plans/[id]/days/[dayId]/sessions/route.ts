import { NextRequest } from "next/server";
import {
  handleApi,
  jsonData,
  parseOptionalNotes,
  parseRequiredDate,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { instantiatePlanDay } from "@/server/db/plans";
import { getWorkoutSessionDetail } from "@/server/db/workouts";
import { ApiHttpError } from "@/server/api/http";

type DayParams = { id: string; dayId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<DayParams> | DayParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const planId = requireUuid(params.id, "plan id");
    const planDayId = requireUuid(params.dayId, "plan day id");
    const body = await readJsonObject(request);
    const performedOn = parseRequiredDate(body.performed_on, "performed_on");
    const notes = parseOptionalNotes(body.notes, "notes") ?? null;
    const sessionId = await instantiatePlanDay(auth.client, {
      userId: auth.userId,
      planId,
      planDayId,
      performedOn,
      notes,
    });
    const session = await getWorkoutSessionDetail(auth.client, auth.userId, sessionId);
    if (!session) {
      throw new ApiHttpError(500, "Session was started but could not be reloaded.");
    }
    return jsonData(session, 201);
  });
}
