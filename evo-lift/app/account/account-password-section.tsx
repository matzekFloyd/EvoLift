import { Check, Lock } from "lucide-react";
import type { AccountPasswordState } from "@/app/account/use-account-password";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export function AccountPasswordSection({ password }: { password: AccountPasswordState }) {
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isSaving,
    canSave,
    notice,
    hasPassword,
    handleSubmit,
  } = password;
  return (
    <SettingsSection>
      <SettingsSectionHeader
        title={hasPassword ? "Change password" : "Set a password"}
        description={
          hasPassword
            ? "Choose a new password to keep your account secure."
            : "Add a password so you can also log in with email."
        }
        icon={<Lock className="h-4 w-4 text-zinc-500" />}
      />
      <SettingsSectionBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          {hasPassword ? (
            <label className="block text-sm font-medium">
              Current password
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            {hasPassword ? "New password" : "Password"}
            <input
              type="password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm font-medium">
            {hasPassword ? "Confirm new password" : "Confirm password"}
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder={hasPassword ? "Repeat new password" : "Repeat password"}
              autoComplete="new-password"
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
              {hasPassword ? "Change password" : "Set password"}
            </button>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}
