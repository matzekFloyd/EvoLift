"use client";

import { Files, Lock, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  accountProfileEpoch,
  loadAccountProfile,
  peekAccountProfile,
  type AccountProfileSnapshot,
} from "@/lib/account-profile-cache";
import { accountHasEmailPassword } from "@/lib/account-has-password";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import { getBrowserUser } from "@/lib/supabase/browser-auth";
import { rememberedUserEmail, rememberedUserId } from "@/lib/signed-in-memory";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  ACCOUNT_PLACEHOLDER_CLASS,
  ACCOUNT_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { PageShell } from "@/app/components/page-shell";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { AccountDoubleProgressionSection } from "@/app/account/account-double-progression-section";
import { AccountDataSection } from "@/app/account/account-data-section";
import { AccountDeleteSection } from "@/app/account/account-delete-section";
import { AccountEmailSection } from "@/app/account/account-email-section";
import { AccountExerciseDefaultsSection } from "@/app/account/account-exercise-defaults-section";
import { AccountHiddenExercisesSection } from "@/app/account/account-hidden-exercises-section";
import { AccountMetricsSection } from "@/app/account/account-metrics-section";
import { AccountMfaSection } from "@/app/account/account-mfa-section";
import { AccountPasswordSection } from "@/app/account/account-password-section";
import { ACCOUNT_SECTIONS, type AccountSectionId } from "@/app/account/account-section";
import { AccountApiTokensSection } from "@/app/account/api-tokens-section";
import { useAccountEmail } from "@/app/account/use-account-email";
import { useAccountMetrics } from "@/app/account/use-account-metrics";
import { useAccountMfa } from "@/app/account/use-account-mfa";
import { useAccountPassword } from "@/app/account/use-account-password";
import { useDoubleProgression } from "@/app/account/use-double-progression";
import { useExerciseDefaults } from "@/app/account/use-exercise-defaults";
import { useHiddenExercises } from "@/app/account/use-hidden-exercises";

const ACCOUNT_TAB_ICON_CLASS = "hidden h-3.5 w-3.5 sm:inline";

function accountTabIcon(id: AccountSectionId) {
  if (id === "security") {
    return <Lock aria-hidden className={ACCOUNT_TAB_ICON_CLASS} />;
  }
  if (id === "profile") {
    return <UserRound aria-hidden className={ACCOUNT_TAB_ICON_CLASS} />;
  }
  if (id === "exercises") {
    return <SlidersHorizontal aria-hidden className={ACCOUNT_TAB_ICON_CLASS} />;
  }
  return <Files aria-hidden className={ACCOUNT_TAB_ICON_CLASS} />;
}

export default function AccountPage() {
  const router = useRouter();
  const [cachedAccount] = useState(() => {
    const id = rememberedUserId();
    return id ? peekAccountProfile(id) : null;
  });
  const [isChecking, setIsChecking] = useState(cachedAccount == null);
  const [userId, setUserId] = useState<string | null>(rememberedUserId);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(rememberedUserEmail);
  const [hasPassword, setHasPassword] = useState(true);
  const [exerciseOptions, setExerciseOptions] = useState(cachedAccount?.exerciseOptions ?? []);
  const [activeSection, setActiveSection] = useState<AccountSectionId>("security");

  const email = useAccountEmail({ accessToken, userEmail, activeSection });
  const password = useAccountPassword({
    accessToken,
    userEmail,
    activeSection,
    hasPassword,
    onPasswordSaved: () => setHasPassword(true),
  });
  const mfa = useAccountMfa({
    accessToken,
    userEmail,
    activeSection,
    hasPassword,
    onAuthenticatorEnabled: setAccessToken,
  });
  const metrics = useAccountMetrics({ userId, cachedAccount, activeSection });
  const hidden = useHiddenExercises({ userId, cachedAccount, activeSection });
  const defaults = useExerciseDefaults({ userId, exerciseOptions, cachedAccount, activeSection });
  const progression = useDoubleProgression({ userId, cachedAccount, activeSection });

  function applyAccountSnapshot(snapshot: AccountProfileSnapshot) {
    setExerciseOptions(snapshot.exerciseOptions);
    if (!defaults.isDirty()) {
      defaults.applySnapshot(snapshot);
    }
    if (!metrics.isDirty()) {
      metrics.applySnapshot(snapshot);
    }
    hidden.applySnapshot(snapshot);
    if (!progression.isDirty()) {
      progression.applySnapshot(snapshot);
    }
  }

  function showAccountLoadError(error: "profile" | "hidden" | "exercises" | "defaults") {
    if (error === "profile") {
      metrics.notice.show("error", "Could not load profile.");
      return;
    }
    if (error === "hidden") {
      hidden.notice.show("error", "Could not load hidden exercises.");
      return;
    }
    if (error === "defaults") {
      defaults.notice.show("error", "Could not load exercise defaults.");
      return;
    }
    hidden.notice.show("error", "Could not load exercises.");
  }

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const started = accountProfileEpoch();
      const visit = await confirmSignedInUser();
      if (!isMounted || started !== accountProfileEpoch()) {
        return;
      }
      if (visit.status === "signed-out") {
        router.replace("/login");
        return;
      }

      setUserId(visit.userId);
      setAccessToken(visit.accessToken);
      setUserEmail(visit.email);
      const verified = await getBrowserUser();
      if (!isMounted || started !== accountProfileEpoch()) {
        return;
      }
      setHasPassword(accountHasEmailPassword(verified?.identities));
      if (!visit.showCached) {
        setIsChecking(true);
      }

      const result = await loadAccountProfile(supabaseBrowserClient, visit.userId, {
        fresh: visit.showCached,
      });
      if (!isMounted || started !== accountProfileEpoch()) {
        return;
      }
      if (result.error || !result.snapshot) {
        if (!visit.showCached) {
          showAccountLoadError(result.error ?? "profile");
        }
        setIsChecking(false);
        return;
      }
      applyAccountSnapshot(result.snapshot);
      setIsChecking(false);
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const accountChrome = (
    <>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <UserRound className="h-6 w-6 text-sky-700" />
        User information
      </h1>
      <SegmentedTabs
        value={activeSection}
        onChange={setActiveSection}
        className="w-full"
        buttonLayout="equal-row"
        buttonMinWidthClassName="min-w-0"
        tabListAriaLabel="Account sections"
        options={ACCOUNT_SECTIONS.map((section) => ({
          value: section.id,
          label: section.label,
          icon: accountTabIcon(section.id),
        }))}
      />
    </>
  );

  if (isChecking) {
    return (
      <PageShell>
        {accountChrome}
        <ContentPlaceholder
          label="Checking session..."
          rows={ACCOUNT_PLACEHOLDER_ROWS}
          rowClassName={ACCOUNT_PLACEHOLDER_CLASS}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {accountChrome}
      {activeSection === "security" ? (
        <>
          <AccountEmailSection userEmail={userEmail} email={email} />
          <AccountPasswordSection password={password} />
          {hasPassword ? <AccountMfaSection mfa={mfa} /> : null}
          {accessToken ? <AccountApiTokensSection accessToken={accessToken} /> : null}
        </>
      ) : null}
      {activeSection === "data" && accessToken ? (
        <>
          <AccountDataSection
            accessToken={accessToken}
            onImported={() => {
              if (!userId) {
                return;
              }
              void loadAccountProfile(supabaseBrowserClient, userId, { fresh: true }).then((result) => {
                if (result.snapshot) {
                  setExerciseOptions(result.snapshot.exerciseOptions);
                  defaults.applySnapshot(result.snapshot);
                  metrics.applySnapshot(result.snapshot);
                  hidden.applySnapshot(result.snapshot);
                  progression.applySnapshot(result.snapshot);
                }
              });
            }}
          />
          <AccountDeleteSection
            accessToken={accessToken}
            userEmail={userEmail}
            hasPassword={hasPassword}
          />
        </>
      ) : null}
      {activeSection === "profile" ? <AccountMetricsSection metrics={metrics} /> : null}
      {activeSection === "exercises" ? (
        <>
          <AccountHiddenExercisesSection exerciseOptions={exerciseOptions} hidden={hidden} />
          <AccountExerciseDefaultsSection exerciseOptions={exerciseOptions} defaults={defaults} />
          <AccountDoubleProgressionSection progression={progression} />
        </>
      ) : null}
    </PageShell>
  );
}
