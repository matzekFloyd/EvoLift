import { NextRequest } from "next/server";
import { handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parseEmailUpdate } from "@/server/api/account-body";
import { requireCurrentPassword, updateAccountEmail } from "@/server/db/account-auth";
import { logSecurityEvent } from "@/server/security/log-security-event";

export async function PATCH(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const input = parseEmailUpdate(body);
    await requireCurrentPassword(auth.userId, input.currentPassword);
    const updated = await updateAccountEmail(auth.userId, input.email);
    logSecurityEvent({
      type: "email_change_requested",
      outcome: "success",
      userId: auth.userId,
    });
    return jsonData(updated);
  });
}
