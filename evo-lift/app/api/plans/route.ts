import { NextRequest } from "next/server";
import {
  handleApi,
  jsonData,
  readJsonObject,
} from "@/server/api/http";
import { parsePlanSaveBody } from "@/server/api/plan-body";
import { createPlan, listPlans } from "@/server/db/plans";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const plans = await listPlans(auth.client, auth.userId);
    return jsonData(
      plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        notes: plan.notes,
        is_active: plan.is_active,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        day_count: plan.dayCount,
      })),
    );
  });
}

export async function POST(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const plan = await createPlan(auth.client, auth.userId, parsePlanSaveBody(body));
    return jsonData(plan, 201);
  });
}
