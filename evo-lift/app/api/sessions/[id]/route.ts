import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  parseOptionalNotes,
  parseRequiredDate,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import {
  deleteWorkoutSession,
  requireWorkoutSessionDetail,
  updateWorkoutSession,
} from "@/server/db/workouts";

type SessionParams = { id: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<SessionParams> | SessionParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const sessionId = requireUuid(id, "session id");
    const session = await requireWorkoutSessionDetail(auth.client, auth.userId, sessionId);
    return jsonData(session);
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<SessionParams> | SessionParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const sessionId = requireUuid(id, "session id");
    const body = await readJsonObject(request);
    const performedOn =
      body.performed_on === undefined
        ? undefined
        : parseRequiredDate(body.performed_on, "performed_on");
    const notes = parseOptionalNotes(body.notes, "notes");
    if (performedOn === undefined && notes === undefined) {
      throw new ApiHttpError(400, "Provide performed_on and/or notes to update.");
    }
    const session = await updateWorkoutSession(auth.client, auth.userId, sessionId, {
      performedOn,
      notes,
    });
    return jsonData(session);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<SessionParams> | SessionParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const sessionId = requireUuid(id, "session id");
    await deleteWorkoutSession(auth.client, auth.userId, sessionId);
    return jsonData({ deleted: true });
  });
}
