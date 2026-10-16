import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseEmailUpdate } from "@/server/api/account-body";
import { requireCurrentPassword, updateAccountEmail } from "@/server/db/account-auth";

export async function PATCH(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const input = parseEmailUpdate(body);
    await requireCurrentPassword(auth.userId, input.currentPassword);
    return jsonData(await updateAccountEmail(auth.userId, input.email));
  });
}
