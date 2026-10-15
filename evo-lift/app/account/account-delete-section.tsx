"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  accountDeleteError,
  CURRENT_PASSWORD_INCORRECT,
} from "@/app/account/account-form";
import { ActionButton } from "@/app/components/action-button";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type AccountDeleteSectionProps = {
  accessToken: string;
  userEmail: string | null;
};

export function AccountDeleteSection({ accessToken, userEmail }: AccountDeleteSectionProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function showError(nextMessage: string) {
    setMessage(nextMessage);
    setIsConfirmOpen(false);
  }

  async function deleteAccount() {
    const validationError = accountDeleteError({ userEmail, currentPassword });
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ currentPassword }),
      });
    } catch {
      showError("Could not delete the account. Try again.");
      setIsDeleting(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      showError(body?.error || CURRENT_PASSWORD_INCORRECT);
      setIsDeleting(false);
      return;
    }

    await supabaseBrowserClient.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Delete account"
        description="Deletes this account and the workout data stored for it. This cannot be undone."
        icon={<Trash2 className="h-4 w-4 text-red-600" />}
      />
      <SettingsSectionBody>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const validationError = accountDeleteError({ userEmail, currentPassword });
            if (validationError) {
              showError(validationError);
              return;
            }
            setMessage(null);
            setIsConfirmOpen(true);
          }}
        >
          <label className="block text-sm font-medium">
            Current password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setIsConfirmOpen(false);
              }}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter your current password"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {message ? (
              <StatusNotice
                message={message}
                tone="error"
                onDismiss={() => setMessage(null)}
                className="sm:flex-1"
              />
            ) : isConfirmOpen ? (
              <p className="text-sm text-red-800 sm:flex-1">Delete this account and its workout data?</p>
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            {isConfirmOpen ? (
              <div className="flex w-full gap-2 sm:w-auto">
                <ActionButton
                  type="button"
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmOpen(false)}
                  className="flex-1 sm:w-28"
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="danger"
                  disabled={isDeleting}
                  onClick={() => void deleteAccount()}
                  className="flex-1 sm:w-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? "Deleting..." : "Delete account"}
                </ActionButton>
              </div>
            ) : (
              <ActionButton type="submit" variant="danger" className="w-full sm:w-40">
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </ActionButton>
            )}
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}
