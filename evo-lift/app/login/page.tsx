"use client";

import { CircleCheck } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AUTH_EMAIL_RECOVERY_PATH,
  authEmailRedirectUrl,
  authOAuthRedirectUrl,
  isAuthEmailRecoverySearch,
} from "@/lib/auth-email-redirect";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { ActionButton } from "@/app/components/action-button";
import { EvoLiftBrand } from "@/app/components/evo-lift-logo";
import { PageFrame } from "@/app/components/page-frame";
import { PasswordField } from "@/app/components/password-field";
import { SectionHeading } from "@/app/components/section-heading";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { StatusNotice } from "@/app/components/status-notice";
import { actionLinkClassName, quietLinkClassName } from "@/app/components/inline-link-class";
import {
  friendlyAuthError,
  loginEmailError,
  loginPasswordError,
  loginResetPasswordError,
  normalizeLoginEmail,
  type LoginPanelMode,
} from "@/app/login/login-form";
import { LoginMfaForm } from "@/app/login/login-mfa-form";
import { loginNeedsAuthenticatorChallenge } from "@/app/login/login-mfa";
import { SocialSignInButtons } from "@/app/login/social-sign-in-buttons";
import {
  friendlyOAuthError,
  loadSocialAuthSettings,
  oauthLoginNotice,
  SOCIAL_SIGN_IN_ENABLED,
  socialSignInBlockedMessage,
  type SocialSignInProvider,
} from "@/app/login/social-sign-in";
import { APP_HOME_PATH } from "@/lib/app-paths";
import {
  authenticatorCodeError,
  normalizeAuthenticatorCode,
  verifiedTotpFactorId,
} from "@/lib/mfa-assurance";
import { PASSWORD_CONFIRM_HINT, PASSWORD_STRENGTH_HINT } from "@/lib/password-policy";
import { reportSecurityEvent } from "@/lib/report-security-event";
import { getBrowserAuthSession } from "@/lib/supabase/browser-auth";

const LOGIN_A11Y_PREFIX = "login-auth";

const emailInputClassName =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginPanelMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [successKind, setSuccessKind] = useState<"confirm" | "forgot" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifiedNotice, setIsVerifiedNotice] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryLinkError, setRecoveryLinkError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const recoveryActiveRef = useRef(false);
  const recoveryReadyRef = useRef(false);
  const mfaChallengeRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let recoveryTimeoutId: number | undefined;
    const params = new URLSearchParams(window.location.search);
    const onRecovery = isAuthEmailRecoverySearch(params);
    setIsVerifiedNotice(params.get("verified") === "1");
    setOauthNotice(oauthLoginNotice(params.get("oauth")));

    function markRecoveryReady() {
      recoveryActiveRef.current = true;
      recoveryReadyRef.current = true;
      setMode("reset");
      setRecoveryReady(true);
      setRecoveryLinkError(null);
    }

    if (onRecovery) {
      recoveryActiveRef.current = true;
      setMode("reset");
    }

    async function sessionNeedsAuthenticator(): Promise<boolean> {
      const { data: sessionData } = await supabaseBrowserClient.auth.getSession();
      const { data: factors, error } = await supabaseBrowserClient.auth.mfa.listFactors();
      return loginNeedsAuthenticatorChallenge({
        accessToken: sessionData.session?.access_token,
        factors: error || !factors ? null : factors.all,
      });
    }

    async function loadSession() {
      const session = await getBrowserAuthSession();

      if (!isMounted) {
        return;
      }

      if (onRecovery) {
        if (session) {
          markRecoveryReady();
        }
        return;
      }

      if (session) {
        const needsMfa = await sessionNeedsAuthenticator();
        if (!isMounted || recoveryActiveRef.current) {
          return;
        }
        if (needsMfa) {
          mfaChallengeRef.current = true;
          setMfaChallenge(true);
          setMode("login");
          return;
        }
        if (!mfaChallengeRef.current) {
          router.replace(APP_HOME_PATH);
        }
      }
    }

    void loadSession();

    if (onRecovery) {
      recoveryTimeoutId = window.setTimeout(() => {
        void (async () => {
          if (!isMounted || recoveryReadyRef.current) {
            return;
          }
          const session = await getBrowserAuthSession();
          if (!isMounted || recoveryReadyRef.current) {
            return;
          }
          if (session) {
            markRecoveryReady();
            return;
          }
          setRecoveryReady(false);
          setRecoveryLinkError(
            "This reset link is invalid or expired. Request a new one from Log in.",
          );
        })();
      }, 3000);
    }

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY") {
        markRecoveryReady();
        return;
      }

      if (onRecovery && session) {
        markRecoveryReady();
        return;
      }

      if (session && !recoveryActiveRef.current) {
        void (async () => {
          const { data: sessionData } = await supabaseBrowserClient.auth.getSession();
          const { data: factors, error } = await supabaseBrowserClient.auth.mfa.listFactors();
          if (!isMounted || recoveryActiveRef.current) {
            return;
          }
          const needsMfa = loginNeedsAuthenticatorChallenge({
            accessToken: sessionData.session?.access_token,
            factors: error || !factors ? null : factors.all,
          });
          if (needsMfa) {
            mfaChallengeRef.current = true;
            setMfaChallenge(true);
            setMode("login");
            return;
          }
          if (!mfaChallengeRef.current) {
            router.replace(APP_HOME_PATH);
          }
        })();
      }
    });

    return () => {
      isMounted = false;
      if (recoveryTimeoutId !== undefined) {
        window.clearTimeout(recoveryTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, [router]);

  function switchMode(nextMode: LoginPanelMode) {
    setMode(nextMode);
    setMessage(null);
    setSuccessEmail(null);
    setSuccessKind(null);
    setPassword("");
    setConfirmPassword("");
    if (nextMode !== "reset") {
      recoveryActiveRef.current = false;
      recoveryReadyRef.current = false;
      setRecoveryReady(false);
      setRecoveryLinkError(null);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeLoginEmail(email);
    const emailError = loginEmailError(normalizedEmail);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    const passwordError = loginPasswordError({ password, confirmPassword, mode: "login" });
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOauthNotice(null);
    setSuccessEmail(null);
    setSuccessKind(null);

    const { error } = await supabaseBrowserClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      void reportSecurityEvent({ type: "login_failed", email: normalizedEmail });
      setMessage(friendlyAuthError(error.message, "login"));
      setIsLoading(false);
      return;
    }

    const { data: factors, error: factorError } = await supabaseBrowserClient.auth.mfa.listFactors();
    const needsMfa = loginNeedsAuthenticatorChallenge({
      accessToken: (await supabaseBrowserClient.auth.getSession()).data.session?.access_token,
      factors: factorError || !factors ? null : factors.all,
    });
    if (needsMfa) {
      mfaChallengeRef.current = true;
      setMfaChallenge(true);
      setMfaCode("");
      setMessage(null);
      setIsLoading(false);
      return;
    }

    router.replace(APP_HOME_PATH);
    setIsLoading(false);
  }

  async function handleMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codeError = authenticatorCodeError(mfaCode);
    if (codeError) {
      setMessage(codeError);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    const listed = await supabaseBrowserClient.auth.mfa.listFactors();
    const factorId = verifiedTotpFactorId(listed.data?.all);
    if (listed.error || !factorId) {
      setMessage(friendlyAuthError(listed.error?.message ?? "missing factor", "mfa"));
      setIsLoading(false);
      return;
    }

    const challenge = await supabaseBrowserClient.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setMessage(friendlyAuthError(challenge.error?.message ?? "challenge failed", "mfa"));
      setIsLoading(false);
      return;
    }

    const verified = await supabaseBrowserClient.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: normalizeAuthenticatorCode(mfaCode),
    });
    if (verified.error) {
      const { data: userData } = await supabaseBrowserClient.auth.getUser();
      void reportSecurityEvent({
        type: "mfa_challenge_failed",
        email: normalizeLoginEmail(email || userData.user?.email || ""),
      });
      setMessage(friendlyAuthError(verified.error.message, "mfa"));
      setIsLoading(false);
      return;
    }

    mfaChallengeRef.current = false;
    setMfaChallenge(false);
    router.replace(APP_HOME_PATH);
    setIsLoading(false);
  }

  async function useDifferentAccount() {
    mfaChallengeRef.current = false;
    setMfaChallenge(false);
    setMfaCode("");
    setMessage(null);
    setPassword("");
    await supabaseBrowserClient.auth.signOut({ scope: "local" });
    window.history.replaceState({}, "", "/login");
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeLoginEmail(email);
    const emailError = loginEmailError(normalizedEmail);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    const passwordError = loginPasswordError({ password, confirmPassword, mode: "register" });
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOauthNotice(null);
    setSuccessEmail(null);
    setSuccessKind(null);

    const emailRedirectTo = authEmailRedirectUrl({
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      windowOrigin: window.location.origin,
    });
    const { error } = await supabaseBrowserClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      setMessage(friendlyAuthError(error.message, "register"));
      setIsLoading(false);
      return;
    }

    setSuccessEmail(normalizedEmail);
    setSuccessKind("confirm");
    setMessage(null);
    setIsLoading(false);
    setMode("login");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = normalizeLoginEmail(email);
    const emailError = loginEmailError(normalizedEmail);
    if (emailError) {
      setMessage(emailError);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOauthNotice(null);
    setSuccessEmail(null);
    setSuccessKind(null);

    const redirectTo = authEmailRedirectUrl({
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      windowOrigin: window.location.origin,
      path: AUTH_EMAIL_RECOVERY_PATH,
    });

    const { error } = await supabaseBrowserClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo ?? undefined,
    });

    if (error) {
      setMessage(friendlyAuthError(error.message, "forgot"));
      setIsLoading(false);
      return;
    }

    setSuccessEmail(normalizedEmail);
    setSuccessKind("forgot");
    setMessage(null);
    setIsLoading(false);
    setMode("login");
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordError = loginResetPasswordError({ password, confirmPassword });
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOauthNotice(null);

    const { error } = await supabaseBrowserClient.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(friendlyAuthError(error.message, "reset"));
      setIsLoading(false);
      return;
    }

    const session = await getBrowserAuthSession();
    if (session?.access_token) {
      void reportSecurityEvent({
        type: "password_changed",
        accessToken: session.access_token,
      });
    }

    setIsLoading(false);
    router.replace(APP_HOME_PATH);
  }

  async function handleSocial(provider: SocialSignInProvider) {
    if (!SOCIAL_SIGN_IN_ENABLED[provider]) {
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setOauthNotice(null);
    setSuccessEmail(null);
    setSuccessKind(null);

    const settings = await loadSocialAuthSettings({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    const blocked = socialSignInBlockedMessage(settings, provider);
    if (blocked) {
      setMessage(blocked);
      setIsLoading(false);
      return;
    }

    const redirectTo = authOAuthRedirectUrl({
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      windowOrigin: window.location.origin,
    });
    if (!redirectTo) {
      setMessage(friendlyOAuthError("missing redirect", provider));
      setIsLoading(false);
      return;
    }

    const { error } = await supabaseBrowserClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });

    if (error) {
      setMessage(friendlyOAuthError(error.message, provider));
      setIsLoading(false);
    }
  }

  const showAuthTabs = mode === "login" || mode === "register";
  const formSubmit =
    mode === "login"
      ? handleLogin
      : mode === "register"
        ? handleRegister
        : mode === "forgot"
          ? handleForgot
          : handleReset;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-sky-50 to-white">
      <div className="bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex w-full max-w-md justify-center px-4 py-6 sm:px-6">
          <EvoLiftBrand
            asHeading
            markClassName="h-12 w-12"
            titleClassName="text-2xl leading-none font-bold tracking-[-0.04em] text-sky-900"
          />
        </div>
      </div>
      <PageFrame className="max-w-md justify-start gap-6">
        <div className="flex w-full flex-col gap-6 pt-4">
          <section className="panel p-4">
            {isVerifiedNotice && mode !== "reset" ? (
              <StatusNotice
                tone="success"
                message="Email confirmed. You can log in now."
                className="mb-4"
              />
            ) : null}
            {oauthNotice && !message && mode !== "reset" && !mfaChallenge ? (
              <StatusNotice tone="error" message={oauthNotice} className="mb-4" />
            ) : null}
            {mfaChallenge ? (
              <LoginMfaForm
                code={mfaCode}
                onCodeChange={setMfaCode}
                message={message}
                isLoading={isLoading}
                onSubmit={(event) => void handleMfa(event)}
                onUseDifferentAccount={() => void useDifferentAccount()}
              />
            ) : null}
            {showAuthTabs && !mfaChallenge ? (
              <div className="mb-5">
                <SegmentedTabs
                  value={mode as "login" | "register"}
                  onChange={(nextMode) => {
                    switchMode(nextMode);
                  }}
                  className="w-full"
                  buttonLayout="equal-row"
                  buttonMinWidthClassName="sm:min-w-0"
                  tabListAriaLabel="Log in or register"
                  a11yIdPrefix={LOGIN_A11Y_PREFIX}
                  options={[
                    { value: "login", label: "Log in" },
                    { value: "register", label: "Register" },
                  ]}
                />
              </div>
            ) : null}
            {!showAuthTabs && !mfaChallenge ? (
              <div className="mb-5">
                <SectionHeading>
                  {mode === "forgot" ? "Forgot password" : "Set a new password"}
                </SectionHeading>
                <p className="mt-1 text-sm text-zinc-600">
                  {mode === "forgot"
                    ? "Enter your email and we will send a reset link."
                    : "Choose a new password for your account."}
                </p>
              </div>
            ) : null}

            {mfaChallenge ? null : (
            <div
              {...(showAuthTabs
                ? {
                    id: `${LOGIN_A11Y_PREFIX}-panel-${mode}`,
                    role: "tabpanel" as const,
                    "aria-labelledby": `${LOGIN_A11Y_PREFIX}-tab-${mode}`,
                  }
                : {})}
            >
              <form onSubmit={formSubmit} className="space-y-4">
                {mode !== "reset" ? (
                  <label className="block text-sm font-medium">
                    Email
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className={emailInputClassName}
                      placeholder="you@example.com"
                    />
                  </label>
                ) : null}

                {mode === "login" || mode === "register" ? (
                  <PasswordField
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Your password" : undefined}
                    hint={mode === "register" ? PASSWORD_STRENGTH_HINT : undefined}
                    required
                  />
                ) : null}

                {mode === "login" ? (
                  <div className="-mt-2">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className={actionLinkClassName}
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : null}

                {mode === "register" ? (
                  <PasswordField
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    hint={PASSWORD_CONFIRM_HINT}
                    required
                  />
                ) : null}

                {mode === "reset" ? (
                  <>
                    {recoveryLinkError ? (
                      <StatusNotice tone="error" message={recoveryLinkError} />
                    ) : !recoveryReady ? (
                      <p className="text-sm text-zinc-600" role="status">
                        Opening reset link…
                      </p>
                    ) : null}
                    <PasswordField
                      label="New password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      hint={PASSWORD_STRENGTH_HINT}
                      required
                      disabled={!recoveryReady}
                    />
                    <PasswordField
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                      hint={PASSWORD_CONFIRM_HINT}
                      required
                      disabled={!recoveryReady}
                    />
                  </>
                ) : null}

                {message ? <StatusNotice tone="error" message={message} /> : null}
                {showAuthTabs ? (
                  <ActionButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={isLoading}
                    className="!h-11"
                  >
                    {mode === "login" ? "Log in" : "Register"}
                  </ActionButton>
                ) : (
                  <div className="flex w-full items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (mode === "reset") {
                          window.history.replaceState({}, "", "/login");
                        }
                        switchMode("login");
                      }}
                      className={`mr-auto shrink-0 ${actionLinkClassName}`}
                    >
                      Back to log in
                    </button>
                    <ActionButton
                      type="submit"
                      variant="primary"
                      disabled={
                        isLoading || (mode === "reset" && (!recoveryReady || Boolean(recoveryLinkError)))
                      }
                      className="ml-auto shrink-0"
                    >
                      {mode === "forgot" ? "Send reset link" : "Set new password"}
                    </ActionButton>
                  </div>
                )}
              </form>
              {showAuthTabs ? (
                <>
                  <SocialSignInButtons
                    disabled={isLoading}
                    onSelect={(provider) => void handleSocial(provider)}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                      className={`shrink-0 ${quietLinkClassName}`}
                    >
                      Terms of use
                    </Link>
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                      className={`shrink-0 ${quietLinkClassName}`}
                    >
                      Privacy policy
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
            )}
          </section>

          {successEmail && successKind ? (
            <section className="panel p-4 text-sm" role="status" aria-live="polite">
              <SectionHeading className="inline-flex items-center gap-1">
                <CircleCheck className="h-4 w-4 text-sky-700" aria-hidden />
                Check your inbox
              </SectionHeading>
              <p className="mt-1 text-zinc-700">
                {successKind === "confirm" ? (
                  <>
                    We sent a confirmation link to <span className="font-medium">{successEmail}</span>.
                    Confirm your email, then log in.
                  </>
                ) : (
                  <>
                    We sent a reset link to <span className="font-medium">{successEmail}</span>. Open
                    it to choose a new password.
                  </>
                )}
              </p>
            </section>
          ) : null}
        </div>
      </PageFrame>
    </div>
  );
}
