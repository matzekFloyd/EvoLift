import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ApiHttpError, handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { CURRENT_PASSWORD_REQUIRED } from "@/app/account/account-form";
import { readAccount, requireCurrentPassword } from "@/server/db/account-auth";
import { logSecurityEvent } from "@/server/security/log-security-event";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await readAccount(auth.userId));
  });
}

export async function DELETE(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const account = await readAccount(auth.userId);
    if (account.has_password) {
      const body = await readJsonObject(request);
      const currentPassword = body.currentPassword ?? body.current_password;
      if (typeof currentPassword !== "string" || !currentPassword) {
        throw new ApiHttpError(400, CURRENT_PASSWORD_REQUIRED);
      }
      await requireCurrentPassword(auth.userId, currentPassword);
    }
    const admin = createServiceRoleClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.userId);
    if (deleteError) {
      throw new ApiHttpError(500, "Could not delete the account. Try again.");
    }
    logSecurityEvent({
      type: "account_deleted",
      outcome: "success",
      userId: auth.userId,
    });
    return jsonData({ deleted: true });
  });
}
