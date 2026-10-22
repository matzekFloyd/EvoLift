import { useEffect, useRef, useState } from "react";
import type { AccountProfileSnapshot } from "@/lib/account-profile-cache";
import { refillAccountCache } from "@/app/account/account-cache";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";
import { invalidateDoubleProgressionPreference } from "@/lib/double-progression-preference";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function useDoubleProgression({
  userId,
  cachedAccount,
  activeSection,
}: {
  userId: string | null;
  cachedAccount: AccountProfileSnapshot | null;
  activeSection: AccountSectionId;
}) {
  const initialEnabled = cachedAccount?.doubleProgression === true;
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);
  const savedRef = useRef(initialEnabled);
  const currentRef = useRef(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;
  currentRef.current = enabled;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  function applySnapshot(snapshot: AccountProfileSnapshot) {
    const next = snapshot.doubleProgression === true;
    savedRef.current = next;
    currentRef.current = next;
    setSavedEnabled(next);
    setEnabled(next);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      notice.show("error", "Please log in again to save double progression.");
      return;
    }
    setIsSaving(true);
    notice.clear();
    const { error } = await supabaseBrowserClient
      .from("app_users")
      .update({ double_progression: enabled })
      .eq("id", userId);
    setIsSaving(false);
    if (error) {
      notice.show("error", `Could not save double progression: ${error.message}`);
      return;
    }
    savedRef.current = enabled;
    setSavedEnabled(enabled);
    invalidateDoubleProgressionPreference();
    refillAccountCache(userId);
    notice.clear();
  }

  return {
    enabled,
    setEnabled,
    isSaving,
    canSave: enabled !== savedEnabled,
    notice,
    isDirty: () => currentRef.current !== savedRef.current,
    applySnapshot,
    handleSave,
  };
}

export type DoubleProgressionState = ReturnType<typeof useDoubleProgression>;
