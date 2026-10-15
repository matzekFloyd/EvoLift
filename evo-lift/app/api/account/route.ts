import { NextRequest } from "next/server";
import {
  ACCOUNT_EMAIL_UNAVAILABLE,
  CURRENT_PASSWORD_INCORRECT,
  CURRENT_PASSWORD_REQUIRED,
} from "@/app/account/account-form";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { handleApi, jsonData, readJsonObject, ApiHttpError } from "@/server/api/http";

export async function DELETE(request: NextRequest) {
  return handleApi(request, async (auth) => {
    const body = await readJsonObject(request);
    const currentPassword = body.currentPassword;
    if (typeof currentPassword !== "string" || currentPassword.length === 0) {
      throw new ApiHttpError(400, CURRENT_PASSWORD_REQUIRED);
    }

    const admin = createServiceRoleClient();
    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(auth.userId);
    const email = userResult.user?.email;
    if (userError || !email) {
      throw new ApiHttpError(400, ACCOUNT_EMAIL_UNAVAILABLE);
    }

    const { error: passwordError } = await createPublicServerClient().auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (passwordError) {
      if ((passwordError.status ?? 400) >= 500) {
        throw new ApiHttpError(500, "Could not verify the current password. Try again.");
      }
      throw new ApiHttpError(400, CURRENT_PASSWORD_INCORRECT);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.userId);
    if (deleteError) {
      throw new ApiHttpError(500, "Could not delete the account. Try again.");
    }

    return jsonData({ deleted: true });
  });
}
