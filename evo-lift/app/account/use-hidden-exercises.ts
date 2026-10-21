import { useEffect, useState } from "react";
import type { AccountProfileSnapshot } from "@/lib/account-profile-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { refillAccountCache } from "@/app/account/account-cache";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";

export function useHiddenExercises({
  userId,
  cachedAccount,
  activeSection,
}: {
  userId: string | null;
  cachedAccount: AccountProfileSnapshot | null;
  activeSection: AccountSectionId;
}) {
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(
    () => new Set(cachedAccount?.hiddenExerciseIds ?? []),
  );
  const [toggleExerciseId, setToggleExerciseId] = useState<string | null>(null);
  const notice = useAccountNotice("error");
  const clearNotice = notice.clear;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  function applySnapshot(snapshot: AccountProfileSnapshot) {
    setHiddenExerciseIds(new Set(snapshot.hiddenExerciseIds));
  }

  async function handleToggle(exerciseId: string, hide: boolean) {
    if (!userId) {
      return;
    }
    setToggleExerciseId(exerciseId);
    if (hide) {
      const { error } = await supabaseBrowserClient.from("user_hidden_exercises").insert({
        user_id: userId,
        exercise_id: exerciseId,
      });
      if (error && error.code !== "23505") {
        notice.show("error", `Could not hide exercise: ${error.message}`);
        setToggleExerciseId(null);
        return;
      }
      setHiddenExerciseIds((prev) => {
        const next = new Set(prev);
        next.add(exerciseId);
        return next;
      });
    } else {
      const { error } = await supabaseBrowserClient
        .from("user_hidden_exercises")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId);
      if (error) {
        notice.show("error", `Could not unhide exercise: ${error.message}`);
        setToggleExerciseId(null);
        return;
      }
      setHiddenExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
    }
    refillAccountCache(userId);
    setToggleExerciseId(null);
  }

  return { hiddenExerciseIds, toggleExerciseId, notice, applySnapshot, handleToggle };
}

export type HiddenExercisesState = ReturnType<typeof useHiddenExercises>;
