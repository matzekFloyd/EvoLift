import { NextRequest } from "next/server";
import { ACCOUNT_EMAIL_UNAVAILABLE } from "@/app/account/account-form";
import { ApiHttpError, handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parsePasswordUpdate } from "@/server/api/account-body";
import { readAccount, requireCurrentPassword, updateAccountPassword } from "@/server/db/account-auth";

export async function PATCH(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const account = await readAccount(auth.userId);
    if (!account.email) {
      throw new ApiHttpError(400, ACCOUNT_EMAIL_UNAVAILABLE);
    }
    const body = await readJsonObject(request);
    const input = parsePasswordUpdate(body, account.email);
    await requireCurrentPassword(auth.userId, input.currentPassword);
    await updateAccountPassword(auth.userId, input.newPassword);
    return jsonData({ updated: true });
  });
}
