import { NextRequest } from "next/server";
import {
  ApiHttpError,
  handleApi,
  jsonData,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { parsePlanSaveBody } from "@/server/api/plan-body";
import { requireOwnedPlanId } from "@/server/db/owned";
import { deletePlan, getPlanById, updatePlan } from "@/server/db/plans";

type PlanParams = { id: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<PlanParams> | PlanParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const planId = await requireOwnedPlanId(auth.client, auth.userId, requireUuid(id, "plan id"));
    const plan = await getPlanById(auth.client, auth.userId, planId);
    if (!plan) {
      throw new ApiHttpError(404, "Plan not found.");
    }
    return jsonData(plan);
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<PlanParams> | PlanParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const planId = requireUuid(id, "plan id");
    const body = await readJsonObject(request);
    const plan = await updatePlan(auth.client, auth.userId, planId, parsePlanSaveBody(body));
    return jsonData(plan);
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<PlanParams> | PlanParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    await deletePlan(auth.client, auth.userId, requireUuid(id, "plan id"));
    return jsonData({ deleted: true });
  });
}
