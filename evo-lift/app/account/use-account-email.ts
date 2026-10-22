import { useEffect, useState } from "react";
import { authEmailRedirectUrl } from "@/lib/auth-email-redirect";
import { friendlyAuthError } from "@/lib/friendly-auth-error";
import { reportSecurityEvent } from "@/lib/report-security-event";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { accountEmailUpdateError, normalizeAccountEmail } from "@/app/account/account-form";
import { accountEmailChanged } from "@/app/account/account-section-dirty";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";

export function useAccountEmail({
  accessToken,
  userEmail,
  activeSection,
}: {
  accessToken: string | null;
  userEmail: string | null;
  activeSection: AccountSectionId;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeAccountEmail(newEmail);
    const emailError = accountEmailUpdateError(newEmail);
    if (emailError) {
      notice.show("error", emailError);
      return;
    }

    setIsSaving(true);
    notice.clear();

    const emailRedirectTo = authEmailRedirectUrl({
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      windowOrigin: window.location.origin,
    });
    const { error } = await supabaseBrowserClient.auth.updateUser(
      { email: normalized },
      emailRedirectTo ? { emailRedirectTo } : undefined,
    );

    if (error) {
      notice.show("error", friendlyAuthError(error.message, "account"));
      setIsSaving(false);
      return;
    }

    if (accessToken) {
      void reportSecurityEvent({
        type: "email_change_requested",
        accessToken,
      });
    }

    notice.clear();
    setNewEmail("");
    setIsSaving(false);
  }

  return {
    newEmail,
    setNewEmail,
    isSaving,
    canSave: accountEmailChanged(userEmail, newEmail),
    notice,
    handleSubmit,
  };
}

export type AccountEmailState = ReturnType<typeof useAccountEmail>;
