import { NextRequest } from "next/server";
import {
  handleApi,
  jsonData,
  parseOptionalDateQuery,
  parseOptionalNotes,
  parseOptionalUuid,
  parseRequiredDate,
  readJsonObject,
  ApiHttpError,
} from "@/server/api/http";
import { parseSessionExerciseList } from "@/server/api/session-body";
import { instantiateTemplateSession } from "@/server/db/templates";
import {
  createWorkoutSessionWithExercises,
  listWorkoutSessions,
} from "@/server/db/workouts";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const from = parseOptionalDateQuery(request.nextUrl.searchParams.get("from"), "from");
    const to = parseOptionalDateQuery(request.nextUrl.searchParams.get("to"), "to");
    if (from && to && from > to) {
      throw new ApiHttpError(400, "from must be on or before to.");
    }
    const sessions = await listWorkoutSessions(auth.client, auth.userId, { from, to });
    return jsonData(sessions);
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const performedOn = parseRequiredDate(body.performed_on, "performed_on");
    const notes = parseOptionalNotes(body.notes, "notes") ?? null;
    const templateId = parseOptionalUuid(body.template_id, "template_id");
    const hasExercises = body.exercises !== undefined;

    if (templateId && hasExercises) {
      throw new ApiHttpError(400, "Provide either template_id or exercises, not both.");
    }

    if (templateId) {
      const session = await instantiateTemplateSession(auth.client, {
        userId: auth.userId,
        templateId,
        performedOn,
        notes,
      });
      return jsonData(session, 201);
    }

    const exercises = parseSessionExerciseList(body.exercises);
    const session = await createWorkoutSessionWithExercises(auth.client, {
      userId: auth.userId,
      performedOn,
      notes,
      exercises,
    });
    return jsonData(session, 201);
  });
}
