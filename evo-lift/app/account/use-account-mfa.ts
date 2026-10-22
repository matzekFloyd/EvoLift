"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";
import { friendlyAuthError } from "@/lib/friendly-auth-error";
import {
  authenticatorCodeError,
  authenticatorQrSrc,
  normalizeAuthenticatorCode,
  unverifiedTotpFactorIds,
  verifiedTotpFactorId,
  type MfaFactorLike,
} from "@/lib/mfa-assurance";
import { reportSecurityEvent } from "@/lib/report-security-event";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { verifyCurrentPassword } from "@/lib/verify-current-password";
import { CURRENT_PASSWORD_INCORRECT, CURRENT_PASSWORD_REQUIRED } from "@/app/account/account-form";

export type AccountMfaPhase = "loading" | "off" | "pending" | "on";

async function listMfaFactors(): Promise<
  { factors: MfaFactorLike[]; errorMessage: string | null }
> {
  const { data, error } = await supabaseBrowserClient.auth.mfa.listFactors();
  if (error || !data) {
    return {
      factors: [],
      errorMessage: friendlyAuthError(error?.message ?? "list failed", "mfa-setup"),
    };
  }
  return { factors: data.all, errorMessage: null };
}

export function useAccountMfa({
  accessToken,
  userEmail,
  activeSection,
  hasPassword,
  onAuthenticatorEnabled,
}: {
  accessToken: string | null;
  userEmail: string | null;
  activeSection: AccountSectionId;
  hasPassword: boolean;
  onAuthenticatorEnabled?: (accessToken: string) => void;
}) {
  const [phase, setPhase] = useState<AccountMfaPhase>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;
  const showNotice = notice.show;

  const applyFactors = useCallback((factors: readonly MfaFactorLike[]) => {
    const verifiedId = verifiedTotpFactorId(factors);
    if (verifiedId) {
      setPhase("on");
      setFactorId(verifiedId);
      setSecret(null);
      setQrSrc(null);
      setCode("");
      return;
    }
    setPhase("off");
    setFactorId(null);
    setSecret(null);
    setQrSrc(null);
  }, []);

  const load = useCallback(async () => {
    setPhase("loading");
    const listed = await listMfaFactors();
    if (listed.errorMessage) {
      setPhase("off");
      showNotice("error", listed.errorMessage);
      return;
    }
    applyFactors(listed.factors);
  }, [applyFactors, showNotice]);

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  useEffect(() => {
    if (!hasPassword || activeSection !== "security") {
      return;
    }
    void load();
  }, [activeSection, hasPassword, load]);

  async function startEnroll() {
    setIsBusy(true);
    notice.clear();
    const listed = await listMfaFactors();
    if (listed.errorMessage) {
      notice.show("error", listed.errorMessage);
      setIsBusy(false);
      return;
    }
    if (verifiedTotpFactorId(listed.factors)) {
      applyFactors(listed.factors);
      setIsBusy(false);
      return;
    }
    for (const id of unverifiedTotpFactorIds(listed.factors)) {
      await supabaseBrowserClient.auth.mfa.unenroll({ factorId: id });
    }
    const enrolled = await supabaseBrowserClient.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
      issuer: "EvoLift",
    });
    if (enrolled.error || !enrolled.data) {
      notice.show("error", friendlyAuthError(enrolled.error?.message ?? "enroll failed", "mfa-setup"));
      setIsBusy(false);
      return;
    }
    setFactorId(enrolled.data.id);
    setSecret(enrolled.data.totp.secret);
    setQrSrc(authenticatorQrSrc(enrolled.data.totp.qr_code));
    setCode("");
    setPhase("pending");
    setIsBusy(false);
  }

  async function verifyEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codeError = authenticatorCodeError(code);
    if (codeError || !factorId) {
      notice.show("error", codeError ?? "Could not set up the authenticator app. Please try again.");
      return;
    }
    setIsBusy(true);
    notice.clear();
    const challenge = await supabaseBrowserClient.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      notice.show("error", friendlyAuthError(challenge.error?.message ?? "challenge failed", "mfa"));
      setIsBusy(false);
      return;
    }
    const verified = await supabaseBrowserClient.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: normalizeAuthenticatorCode(code),
    });
    if (verified.error) {
      notice.show("error", friendlyAuthError(verified.error.message, "mfa"));
      setIsBusy(false);
      return;
    }
    const { data: sessionData } = await supabaseBrowserClient.auth.getSession();
    const enrolledToken = sessionData.session?.access_token;
    if (enrolledToken) {
      onAuthenticatorEnabled?.(enrolledToken);
      void reportSecurityEvent({ type: "mfa_enrolled", accessToken: enrolledToken });
    }
    setPhase("on");
    setSecret(null);
    setQrSrc(null);
    setCode("");
    setCurrentPassword("");
    notice.show("success", "Authenticator app is on. Login will ask for a code after your password.");
    setIsBusy(false);
  }

  async function cancelEnroll() {
    setIsBusy(true);
    notice.clear();
    if (factorId) {
      const { error } = await supabaseBrowserClient.auth.mfa.unenroll({ factorId });
      if (error) {
        notice.show("error", friendlyAuthError(error.message, "mfa-setup"));
        setIsBusy(false);
        return;
      }
    }
    setPhase("off");
    setFactorId(null);
    setSecret(null);
    setQrSrc(null);
    setCode("");
    setIsBusy(false);
  }

  async function copySecret() {
    if (!secret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(secret);
      notice.show("success", "Setup key copied.");
    } catch {
      notice.show("error", "Could not copy the setup key. Select it and copy it manually.");
    }
  }

  async function disableAuthenticator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) {
      notice.show("error", CURRENT_PASSWORD_REQUIRED);
      return;
    }
    if (!userEmail) {
      notice.show("error", "Could not verify current user email. Please log in again.");
      return;
    }
    setIsBusy(true);
    notice.clear();
    const reauth = await verifyCurrentPassword(userEmail, currentPassword);
    if (!reauth.ok) {
      if (accessToken) {
        void reportSecurityEvent({ type: "password_verify_failed", accessToken });
      }
      notice.show("error", CURRENT_PASSWORD_INCORRECT);
      setIsBusy(false);
      return;
    }
    const listed = await listMfaFactors();
    if (listed.errorMessage) {
      notice.show("error", listed.errorMessage);
      setIsBusy(false);
      return;
    }
    const verifiedId = verifiedTotpFactorId(listed.factors);
    if (!verifiedId) {
      applyFactors(listed.factors);
      setIsBusy(false);
      return;
    }
    const { error } = await supabaseBrowserClient.auth.mfa.unenroll({ factorId: verifiedId });
    if (error) {
      notice.show("error", friendlyAuthError(error.message, "mfa-disable"));
      setIsBusy(false);
      return;
    }
    if (accessToken) {
      void reportSecurityEvent({ type: "mfa_disabled", accessToken });
    }
    setPhase("off");
    setFactorId(null);
    setCurrentPassword("");
    notice.show("success", "Authenticator app is off. Login will only ask for your password.");
    setIsBusy(false);
  }

  return {
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
  };
}

export type AccountMfaState = ReturnType<typeof useAccountMfa>;
