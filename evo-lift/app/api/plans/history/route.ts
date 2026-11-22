import { NextRequest } from "next/server";
import { handleApi, jsonData, parseOptionalUuid } from "@/server/api/http";
import { listPlanActivations } from "@/server/db/plans";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const planId = parseOptionalUuid(request.nextUrl.searchParams.get("plan_id"), "plan_id");
    const history = await listPlanActivations(auth.client, auth.userId, planId);
    return jsonData(history);
  });
}
