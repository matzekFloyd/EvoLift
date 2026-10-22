import { ShieldCheck } from "lucide-react";
import type { AccountMfaState } from "@/app/account/use-account-mfa";
import { ActionButton } from "@/app/components/action-button";
import { PasswordField } from "@/app/components/password-field";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";
import { LOST_AUTHENTICATOR_MESSAGE } from "@/lib/mfa-assurance";

const codeInputClassName =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

export function AccountMfaSection({ mfa }: { mfa: AccountMfaState }) {
  const {
    phase,
    secret,
    qrSrc,
    code,
    setCode,
    currentPassword,
    setCurrentPassword,
    isBusy,
    notice,
    startEnroll,
    verifyEnroll,
    cancelEnroll,
    copySecret,
    disableAuthenticator,
  } = mfa;

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Authenticator app"
        description="Optional. When this is on, login asks for a code from your authenticator app after your password. You can turn it off later."
        icon={<ShieldCheck className="h-4 w-4 text-zinc-500" aria-hidden />}
      />
      <SettingsSectionBody>
        {phase === "loading" ? (
          <p className="text-sm text-zinc-600" role="status">
            Checking authenticator settings…
          </p>
        ) : null}

        {phase === "off" ? (
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
              type="button"
              variant="primary"
              disabled={isBusy}
              onClick={() => void startEnroll()}
              className="w-full sm:w-auto"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Set up authenticator
            </ActionButton>
          </div>
        ) : null}

        {phase === "pending" ? (
          <form onSubmit={(event) => void verifyEnroll(event)} className="space-y-3">
            <p className="text-sm text-zinc-600">
              Scan the QR code with your authenticator app, or enter the setup key.
            </p>
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR code for the authenticator app"
                className="h-36 w-36 bg-white p-2"
              />
            ) : null}
            {secret ? (
              <div>
                <p className="text-sm font-medium">Setup key</p>
                <p className="mt-1 font-mono text-sm break-all text-zinc-800">{secret}</p>
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  className="mt-2 text-sm font-medium text-sky-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                >
                  Copy setup key
                </button>
              </div>
            ) : null}
            <label className="block text-sm font-medium">
              Authenticator code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className={codeInputClassName}
                placeholder="123456"
                maxLength={7}
              />
            </label>
            {notice.message ? (
              <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <ActionButton type="submit" variant="primary" disabled={isBusy}>
                Verify
              </ActionButton>
              <ActionButton type="button" variant="secondary" disabled={isBusy} onClick={() => void cancelEnroll()}>
                Cancel
              </ActionButton>
            </div>
          </form>
        ) : null}

        {phase === "on" ? (
          <form onSubmit={(event) => void disableAuthenticator(event)} className="space-y-3">
            <p className="text-sm text-zinc-700">On. Login asks for a code after your password.</p>
            <p className="text-sm text-zinc-600">{LOST_AUTHENTICATOR_MESSAGE}</p>
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              placeholder="Enter your current password"
              required
              disabled={isBusy}
            />
            {notice.message ? (
              <StatusNotice message={notice.message} tone={notice.tone} onDismiss={notice.clear} />
            ) : null}
            <ActionButton type="submit" variant="secondary" disabled={isBusy || currentPassword.length === 0}>
              Turn off authenticator
            </ActionButton>
          </form>
        ) : null}
      </SettingsSectionBody>
    </SettingsSection>
  );
}
