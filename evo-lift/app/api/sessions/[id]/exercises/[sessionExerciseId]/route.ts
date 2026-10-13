import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  parseOptionalNonNegativeNumber,
  parseOptionalNotes,
  parseOptionalPositiveInt,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { deleteSessionExercise, updateSessionExercise } from "@/server/db/workouts";

type ExerciseParams = { id: string; sessionExerciseId: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<ExerciseParams> | ExerciseParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const sessionId = requireUuid(params.id, "session id");
    const sessionExerciseId = requireUuid(params.sessionExerciseId, "session exercise id");
    const body = await readJsonObject(request);
    const targetSets = parseOptionalPositiveInt(body.target_sets, "target_sets");
    const targetReps = parseOptionalPositiveInt(body.target_reps, "target_reps");
    const targetWeightKg = parseOptionalNonNegativeNumber(
      body.target_weight_kg,
      "target_weight_kg",
    );
    const baseWeightKg = parseOptionalNonNegativeNumber(body.base_weight_kg, "base_weight_kg");
    const notes = parseOptionalNotes(body.notes, "notes");
    if (
      targetSets === undefined &&
      targetReps === undefined &&
      targetWeightKg === undefined &&
      baseWeightKg === undefined &&
      notes === undefined
    ) {
      throw new ApiHttpError(400, "Provide at least one field to update.");
    }
    const session = await updateSessionExercise(
      auth.client,
      auth.userId,
      sessionId,
      sessionExerciseId,
      {
        targetSets,
        targetReps,
        targetWeightKg,
        baseWeightKg,
        notes,
      },
    );
    return jsonData(session);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<ExerciseParams> | ExerciseParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const sessionId = requireUuid(params.id, "session id");
    const sessionExerciseId = requireUuid(params.sessionExerciseId, "session exercise id");
    const session = await deleteSessionExercise(
      auth.client,
      auth.userId,
      sessionId,
      sessionExerciseId,
    );
    return jsonData(session);
  });
}
