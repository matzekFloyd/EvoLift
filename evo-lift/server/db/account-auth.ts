import {
  ACCOUNT_EMAIL_UNAVAILABLE,
  CURRENT_PASSWORD_INCORRECT,
  CURRENT_PASSWORD_REQUIRED,
} from "@/app/account/account-form";
import { accountHasEmailPassword } from "@/lib/account-has-password";
import { friendlyAuthError } from "@/lib/friendly-auth-error";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ApiHttpError } from "@/server/api/http";
import { logSecurityEvent } from "@/server/security/log-security-event";

export async function requireCurrentPassword(
  userId: string,
  currentPassword: string,
): Promise<{ email: string }> {
  if (!currentPassword) {
    throw new ApiHttpError(400, CURRENT_PASSWORD_REQUIRED);
  }
  const admin = createServiceRoleClient();
  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(userId);
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
    logSecurityEvent({
      type: "password_verify_failed",
      outcome: "failure",
      userId,
    });
    throw new ApiHttpError(400, CURRENT_PASSWORD_INCORRECT);
  }
  return { email };
}

export async function readAccount(userId: string): Promise<{ email: string | null; has_password: boolean }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new ApiHttpError(400, ACCOUNT_EMAIL_UNAVAILABLE);
  }
  const hasPassword = accountHasEmailPassword(data.user.identities);
  return { email: data.user.email ?? null, has_password: hasPassword };
}

export async function updateAccountEmail(userId: string, email: string): Promise<{ email: string }> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.updateUserById(userId, { email });
  if (error || !data.user) {
    throw new ApiHttpError(
      400,
      error ? friendlyAuthError(error.message, "account") : "Could not update the email.",
    );
  }
  return { email: data.user.email ?? email };
}

export async function updateAccountPassword(userId: string, password: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    throw new ApiHttpError(400, friendlyAuthError(error.message, "account"));
  }
}
