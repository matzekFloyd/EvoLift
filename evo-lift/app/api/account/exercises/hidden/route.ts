import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseHiddenExerciseIds } from "@/server/api/account-body";
import { listHiddenExerciseIds, replaceHiddenExercises } from "@/server/db/profile";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData({ exercise_ids: await listHiddenExerciseIds(auth.client, auth.userId) });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const exerciseIds = await replaceHiddenExercises(
      auth.client,
      auth.userId,
      parseHiddenExerciseIds(body),
    );
    return jsonData({ exercise_ids: exerciseIds });
  });
}
