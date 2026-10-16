import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { parseGoalBody } from "@/server/api/goal-body";
import { deleteGoal, getGoal, updateGoal } from "@/server/db/goals";

type GoalParams = { id: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<GoalParams> | GoalParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const goal = await getGoal(auth.client, auth.userId, requireUuid(id, "goal id"));
    if (!goal) {
      throw new ApiHttpError(404, "Goal not found.");
    }
    return jsonData(goal);
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<GoalParams> | GoalParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const body = await readJsonObject(request);
    const goal = await updateGoal(
      auth.client,
      auth.userId,
      requireUuid(id, "goal id"),
      parseGoalBody(body),
    );
    return jsonData(goal);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<GoalParams> | GoalParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    await deleteGoal(auth.client, auth.userId, requireUuid(id, "goal id"));
    return jsonData({ deleted: true });
  });
}
