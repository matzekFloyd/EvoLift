"use client";

import { FormEvent } from "react";
import { ActionButton } from "@/app/components/action-button";
import { SectionHeading } from "@/app/components/section-heading";
import { StatusNotice } from "@/app/components/status-notice";
import { actionLinkClassName } from "@/app/components/inline-link-class";
import { LOST_AUTHENTICATOR_MESSAGE } from "@/lib/mfa-assurance";

const codeInputClassName =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

export function LoginMfaForm({
  code,
  onCodeChange,
  message,
  isLoading,
  onSubmit,
  onUseDifferentAccount,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  message: string | null;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseDifferentAccount: () => void;
}) {
  return (
    <>
      <div className="mb-5">
        <SectionHeading>Authenticator code</SectionHeading>
        <p className="mt-1 text-sm text-zinc-600">Enter the 6-digit code from your authenticator app.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Authenticator code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            className={codeInputClassName}
            placeholder="123456"
            maxLength={7}
          />
        </label>
        {message ? <StatusNotice tone="error" message={message} /> : null}
        <ActionButton type="submit" variant="primary" fullWidth disabled={isLoading} className="!h-11">
          Verify
        </ActionButton>
        <button type="button" onClick={onUseDifferentAccount} className={actionLinkClassName}>
          Use a different account
        </button>
        <p className="text-sm text-zinc-600">{LOST_AUTHENTICATOR_MESSAGE}</p>
      </form>
    </>
  );
}
