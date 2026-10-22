import { Check, Mail } from "lucide-react";
import type { AccountEmailState } from "@/app/account/use-account-email";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountEmailSection({
  userEmail,
  email,
}: {
  userEmail: string | null;
  email: AccountEmailState;
}) {
  const { newEmail, setNewEmail, isSaving, canSave, notice, handleSubmit } = email;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Email"
        description="Update the email address used to sign in. Confirm it from the message sent to the new address."
        icon={<Mail className="h-4 w-4 text-zinc-500" />}
      />
      <SettingsSectionBody>
        <label className="block text-sm font-medium">
          Current email
          <input
            type="email"
            readOnly
            value={userEmail ?? "unknown user"}
            className="mt-1 w-full rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
          />
        </label>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            New email
            <input
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="new-email@example.com"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {notice.message ? (
              <StatusNotice
                message={notice.message}
                tone={notice.tone}
                onDismiss={notice.clear}
                className="sm:flex-1"
              />
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            <button
              type="submit"
              disabled={isSaving || !canSave}
              className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:w-40"
            >
              <Check className="h-3.5 w-3.5 text-white" />
              Change email
            </button>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}
