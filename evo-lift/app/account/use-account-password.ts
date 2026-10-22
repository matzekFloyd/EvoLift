import { useEffect, useState } from "react";
import { friendlyAuthError } from "@/lib/friendly-auth-error";
import { reportSecurityEvent } from "@/lib/report-security-event";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { verifyCurrentPassword } from "@/lib/verify-current-password";
import { accountPasswordUpdateError, CURRENT_PASSWORD_INCORRECT } from "@/app/account/account-form";
import { accountPasswordChanged } from "@/app/account/account-section-dirty";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";

export function useAccountPassword({
  accessToken,
  userEmail,
  activeSection,
  hasPassword,
  onPasswordSaved,
}: {
  accessToken: string | null;
  userEmail: string | null;
  activeSection: AccountSectionId;
  hasPassword: boolean;
  onPasswordSaved?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordError = accountPasswordUpdateError({
      userEmail,
      currentPassword,
      newPassword,
      confirmNewPassword,
      hasPassword,
    });
    if (passwordError || !userEmail) {
      notice.show("error", passwordError ?? "Could not verify current user email. Please log in again.");
      return;
    }

    setIsSaving(true);
    notice.clear();

    if (hasPassword) {
      const reauth = await verifyCurrentPassword(userEmail, currentPassword);

      if (!reauth.ok) {
        if (accessToken) {
          void reportSecurityEvent({
            type: "password_verify_failed",
            accessToken,
          });
        }
        notice.show("error", CURRENT_PASSWORD_INCORRECT);
        setIsSaving(false);
        return;
      }
    }

    const { error } = await supabaseBrowserClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      notice.show("error", friendlyAuthError(error.message, "account"));
      setIsSaving(false);
      return;
    }

    if (accessToken) {
      void reportSecurityEvent({
        type: "password_changed",
        accessToken,
      });
    }

    notice.show(
      "success",
      hasPassword ? "Password updated successfully." : "Password saved. You can also log in with email.",
    );
    onPasswordSaved?.();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsSaving(false);
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isSaving,
    canSave: accountPasswordChanged({ currentPassword, newPassword, confirmNewPassword }),
    notice,
    hasPassword,
    handleSubmit,
  };
}

export type AccountPasswordState = ReturnType<typeof useAccountPassword>;
