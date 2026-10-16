import { NextRequest } from "next/server";
import { handleApi, jsonData, readRouteParams, requireUuid } from "@/server/api/http";
import { duplicatePlan } from "@/server/db/plans";

type PlanParams = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<PlanParams> | PlanParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const plan = await duplicatePlan(auth.client, auth.userId, requireUuid(id, "plan id"));
    return jsonData(plan, 201);
  });
}
