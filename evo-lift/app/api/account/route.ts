import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ApiHttpError, handleApi, jsonData, readJsonObject } from "@/server/api/http";
import { readAccount, requireCurrentPassword } from "@/server/db/account-auth";

export async function GET(request: NextRequest) {
  return handleApi(request, async (auth) => {
    return jsonData(await readAccount(auth.userId));
  });
}

export async function DELETE(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const currentPassword = body.currentPassword ?? body.current_password;
    if (typeof currentPassword !== "string") {
      throw new ApiHttpError(400, "Please enter your current password.");
    }
    await requireCurrentPassword(auth.userId, currentPassword);
    const admin = createServiceRoleClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.userId);
    if (deleteError) {
      throw new ApiHttpError(500, "Could not delete the account. Try again.");
    }
    return jsonData({ deleted: true });
  });
}
