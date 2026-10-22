import { NextRequest } from "next/server";
import { ACCOUNT_EMAIL_UNAVAILABLE } from "@/app/account/account-form";
import { ApiHttpError, handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { parsePasswordSet, parsePasswordUpdate } from "@/server/api/account-body";
import { readAccount, requireCurrentPassword, updateAccountPassword } from "@/server/db/account-auth";
import { logSecurityEvent } from "@/server/security/log-security-event";

export async function PATCH(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const account = await readAccount(auth.userId);
    if (!account.email) {
      throw new ApiHttpError(400, ACCOUNT_EMAIL_UNAVAILABLE);
    }
    const body = await readJsonObject(request);
    const newPassword = account.has_password
      ? parsePasswordUpdate(body, account.email).newPassword
      : parsePasswordSet(body).newPassword;
    if (account.has_password) {
      const currentPassword =
        typeof body.current_password === "string" ? body.current_password : "";
      await requireCurrentPassword(auth.userId, currentPassword);
    }
    await updateAccountPassword(auth.userId, newPassword);
    logSecurityEvent({
      type: "password_changed",
      outcome: "success",
      userId: auth.userId,
    });
    return jsonData({ updated: true });
  });
}
