import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject, readRouteParams, requireUuid } from "@/server/api/http";
import { parseExerciseDefaults } from "@/server/api/account-body";
import { clearExerciseDefaults, saveExerciseDefaults } from "@/server/db/profile";

type DefaultsParams = { exerciseId: string };

export async function PUT(
  request: NextRequest,
  context: { params: Promise<DefaultsParams> | DefaultsParams },
) {
  return handleApi(request, async (auth) => {
    const { exerciseId } = await readRouteParams(context.params);
    const id = requireUuid(exerciseId, "exercise id");
    const body = await readJsonObject(request);
    const defaults = await saveExerciseDefaults(
      auth.client,
      auth.userId,
      id,
      parseExerciseDefaults(body, id),
    );
    return jsonData(defaults);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<DefaultsParams> | DefaultsParams },
) {
  return handleApi(request, async (auth) => {
    const { exerciseId } = await readRouteParams(context.params);
    const defaults = await clearExerciseDefaults(
      auth.client,
      auth.userId,
      requireUuid(exerciseId, "exercise id"),
    );
    return jsonData(defaults);
  });
}
