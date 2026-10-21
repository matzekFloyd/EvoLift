"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

/** Keeps the active exercise index in range and clears the global notice when the active exercise changes. */
export function useActiveExerciseReset(input: {
  sessionId: string | undefined;
  isChecking: boolean;
  sessionExercises: Array<{ id: string }>;
  activeExerciseIndex: number;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
  clearMessage: () => void;
}) {
  const {
    sessionId,
    isChecking,
    sessionExercises,
    activeExerciseIndex,
    setActiveExerciseIndex,
    clearMessage,
  } = input;
  /** Tracks `workout_session_exercises.id` for the active row to clear global notices on exercise change (#72). */
  const lastActiveSessionExerciseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeExerciseIndex >= sessionExercises.length) {
      setActiveExerciseIndex(Math.max(0, sessionExercises.length - 1));
    }
  }, [activeExerciseIndex, sessionExercises.length, setActiveExerciseIndex]);

  useEffect(() => {
    lastActiveSessionExerciseIdRef.current = null;
  }, [sessionId]);

  /** Global StatusNotice (message): clear when the active session exercise changes (#72). Session header field errors stay on their controls. */
  useEffect(() => {
    if (isChecking) {
      return;
    }
    if (activeExerciseIndex < 0 || activeExerciseIndex >= sessionExercises.length) {
      return;
    }
    const id = sessionExercises[activeExerciseIndex]?.id;
    if (!id) {
      return;
    }
    const prev = lastActiveSessionExerciseIdRef.current;
    if (prev !== null && id !== prev) {
      clearMessage();
    }
    lastActiveSessionExerciseIdRef.current = id;
  }, [activeExerciseIndex, sessionExercises, isChecking, clearMessage]);
}
