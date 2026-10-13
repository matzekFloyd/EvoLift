import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject, readRouteParams, requireUuid } from "@/server/api/http";
import { parseRequiredSessionExercise } from "@/server/api/session-body";
import { addSessionExercise } from "@/server/db/workouts";

type SessionParams = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<SessionParams> | SessionParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const sessionId = requireUuid(id, "session id");
    const body = await readJsonObject(request);
    const exercise = parseRequiredSessionExercise(body);
    const session = await addSessionExercise(auth.client, auth.userId, sessionId, exercise);
    return jsonData(session, 201);
  });
}
