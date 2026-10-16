import { NextRequest } from "next/server";
import {
  handleApi,
  jsonData,
  parseOptionalBoolean,
  readJsonObject,
  readRouteParams,
  requireUuid,
} from "@/server/api/http";
import { ApiHttpError } from "@/server/api/http";
import { setPlanActive } from "@/server/db/plans";

type PlanParams = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<PlanParams> | PlanParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const planId = requireUuid(id, "plan id");
    const body = await readJsonObject(request);
    const isActive = parseOptionalBoolean(body.is_active, "is_active");
    if (isActive === undefined) {
      throw new ApiHttpError(400, "is_active must be a boolean.");
    }
    await setPlanActive(auth.client, auth.userId, planId, isActive);
    return jsonData({ is_active: isActive });
  });
}
