import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  parseOptionalBoolean,
  parseOptionalNonNegativeNumber,
  parseOptionalNotes,
  parseRequiredPositiveInt,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { deleteOwnedWorkoutSet, updateOwnedWorkoutSet } from "@/server/db/workouts";

type SetParams = { id: string; sessionExerciseId: string; setId: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<SetParams> | SetParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const sessionId = requireUuid(params.id, "session id");
    const sessionExerciseId = requireUuid(params.sessionExerciseId, "session exercise id");
    const setId = requireUuid(params.setId, "set id");
    const body = await readJsonObject(request);
    const reps = body.reps === undefined ? undefined : parseRequiredPositiveInt(body.reps, "reps");
    const weightKg = parseOptionalNonNegativeNumber(body.weight_kg, "weight_kg");
    const isWarmup = parseOptionalBoolean(body.is_warmup, "is_warmup");
    const notes = parseOptionalNotes(body.notes, "notes");
    if (
      reps === undefined &&
      weightKg === undefined &&
      isWarmup === undefined &&
      notes === undefined
    ) {
      throw new ApiHttpError(400, "Provide at least one field to update.");
    }
    const session = await updateOwnedWorkoutSet(
      auth.client,
      auth.userId,
      sessionId,
      sessionExerciseId,
      setId,
      {
        reps,
        weightKg,
        isWarmup,
        notes,
      },
    );
    return jsonData(session);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<SetParams> | SetParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const sessionId = requireUuid(params.id, "session id");
    const sessionExerciseId = requireUuid(params.sessionExerciseId, "session exercise id");
    const setId = requireUuid(params.setId, "set id");
    const session = await deleteOwnedWorkoutSet(
      auth.client,
      auth.userId,
      sessionId,
      sessionExerciseId,
      setId,
    );
    return jsonData(session);
  });
}
