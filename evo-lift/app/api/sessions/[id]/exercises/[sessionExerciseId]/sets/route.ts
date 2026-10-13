import { NextRequest } from "next/server";
import {
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
import { addWorkoutSet } from "@/server/db/workouts";

type SetCollectionParams = { id: string; sessionExerciseId: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<SetCollectionParams> | SetCollectionParams },
) {
  return handleApi(request, async (auth) => {
    const params = await readRouteParams(context.params);
    const sessionId = requireUuid(params.id, "session id");
    const sessionExerciseId = requireUuid(params.sessionExerciseId, "session exercise id");
    const body = await readJsonObject(request);
    const reps = parseRequiredPositiveInt(body.reps, "reps");
    const weightKg = parseOptionalNonNegativeNumber(body.weight_kg, "weight_kg");
    const isWarmup = parseOptionalBoolean(body.is_warmup, "is_warmup") ?? false;
    const notes = parseOptionalNotes(body.notes, "notes");
    const session = await addWorkoutSet(auth.client, auth.userId, sessionId, sessionExerciseId, {
      reps,
      weightKg: weightKg === undefined ? null : weightKg,
      isWarmup,
      notes: notes === undefined ? null : notes,
    });
    return jsonData(session, 201);
  });
}
