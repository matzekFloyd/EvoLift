import { Check } from "lucide-react";
import type { AccountPasswordState } from "@/app/account/use-account-password";
import { ActionButton } from "@/app/components/action-button";
import { PasswordField } from "@/app/components/password-field";
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
      />
      <SettingsSectionBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          {hasPassword ? (
            <PasswordField
              label="Current password"
              required
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          ) : null}
          <PasswordField
            label={hasPassword ? "New password" : "Password"}
            required
            value={newPassword}
            onChange={setNewPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label={hasPassword ? "Confirm new password" : "Confirm password"}
            required
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
            placeholder={hasPassword ? "Repeat new password" : "Repeat password"}
            autoComplete="new-password"
          />
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
            <ActionButton
              type="submit"
              variant="primary"
              disabled={isSaving || !canSave}
              className="w-full sm:w-40"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              {hasPassword ? "Change password" : "Set password"}
            </ActionButton>
          </div>
        </form>
      </SettingsSectionBody>
    </SettingsSection>
  );
}
