"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { SessionExerciseRow } from "./session-detail-actions";

/** Optimistically toggles an exercise's Skipped flag, rolling back and reporting on failure. */
export function useToggleExerciseNotDone(input: {
  setSessionExercises: Dispatch<SetStateAction<SessionExerciseRow[]>>;
  showError: (messageText: string) => void;
}) {
  const { setSessionExercises, showError } = input;
  const [savingNotDoneId, setSavingNotDoneId] = useState<string | null>(null);

  async function toggleExerciseNotDone(sessionExercise: SessionExerciseRow) {
    if (savingNotDoneId === sessionExercise.id) {
      return;
    }
    const next = !sessionExercise.not_done;
    setSavingNotDoneId(sessionExercise.id);
    setSessionExercises((prev) =>
      prev.map((item) => (item.id === sessionExercise.id ? { ...item, not_done: next } : item)),
    );
    const { error } = await supabaseBrowserClient
      .from("workout_session_exercises")
      .update({ not_done: next })
      .eq("id", sessionExercise.id);
    if (error) {
      setSessionExercises((prev) =>
        prev.map((item) =>
          item.id === sessionExercise.id ? { ...item, not_done: !next } : item,
        ),
      );
      showError(`Could not update this exercise: ${error.message}`);
    } else {
      invalidateLoggedHistoryCaches();
    }
    setSavingNotDoneId(null);
  }

  return { savingNotDoneId, toggleExerciseNotDone };
}
