import { useEffect, useRef, useState } from "react";
import type { AccountProfileSnapshot } from "@/lib/account-profile-cache";
import { refillAccountCache } from "@/app/account/account-cache";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";
import {
  DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
  MAIN_LIFT_STAGNATION_WEEKS_ERROR,
  parseMainLiftStagnationWeeks,
} from "@/lib/main-lift-stagnation";
import { invalidateMainLiftStagnationWeeks } from "@/lib/main-lift-stagnation-preference";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function useMainLiftStagnationWeeks({
  userId,
  cachedAccount,
  activeSection,
}: {
  userId: string | null;
  cachedAccount: AccountProfileSnapshot | null;
  activeSection: AccountSectionId;
}) {
  const initialWeeks = cachedAccount?.mainLiftStagnationWeeks ?? DEFAULT_MAIN_LIFT_STAGNATION_WEEKS;
  const [draft, setDraft] = useState(String(initialWeeks));
  const [savedWeeks, setSavedWeeks] = useState(initialWeeks);
  const savedRef = useRef(initialWeeks);
  const draftRef = useRef(String(initialWeeks));
  const [isSaving, setIsSaving] = useState(false);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;
  draftRef.current = draft;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  function applySnapshot(snapshot: AccountProfileSnapshot) {
    const next = snapshot.mainLiftStagnationWeeks;
    savedRef.current = next;
    draftRef.current = String(next);
    setSavedWeeks(next);
    setDraft(String(next));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      notice.show("error", "Please log in again to save this setting.");
      return;
    }
    const weeks = parseMainLiftStagnationWeeks(draft);
    if (weeks == null) {
      notice.show("error", MAIN_LIFT_STAGNATION_WEEKS_ERROR);
      return;
    }
    setIsSaving(true);
    notice.clear();
    const { error } = await supabaseBrowserClient
      .from("app_users")
      .update({ main_lift_stagnation_weeks: weeks })
      .eq("id", userId);
    setIsSaving(false);
    if (error) {
      notice.show("error", `Could not save stalled lifts: ${error.message}`);
      return;
    }
    savedRef.current = weeks;
    draftRef.current = String(weeks);
    setSavedWeeks(weeks);
    setDraft(String(weeks));
    invalidateMainLiftStagnationWeeks();
    refillAccountCache(userId);
    notice.clear();
  }

  const parsed = parseMainLiftStagnationWeeks(draft);

  return {
    draft,
    setDraft,
    isSaving,
    canSave: parsed !== savedWeeks,
    notice,
    isDirty: () => parseMainLiftStagnationWeeks(draftRef.current) !== savedRef.current,
    applySnapshot,
    handleSave,
  };
}

export type MainLiftStagnationWeeksState = ReturnType<typeof useMainLiftStagnationWeeks>;
