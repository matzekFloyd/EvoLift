import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseGoalBody } from "@/server/api/goal-body";
import { createGoal, listGoals } from "@/server/db/goals";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await listGoals(auth.client, auth.userId));
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const goal = await createGoal(auth.client, auth.userId, parseGoalBody(body));
    return jsonData(goal, 201);
  });
}
