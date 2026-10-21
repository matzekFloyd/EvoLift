"use client";

import { useEffect, useState } from "react";
import { compactLogScrollDelta } from "./compact-log-scroll";
import type { SessionExerciseRow, WorkoutSetRow } from "./session-detail-actions";
import { isTargetSetsGoalMet } from "./session-detail-model";

/** Compact (phone) single-exercise logging: media query, extra-set composer, and next-action scroll. */
export function useCompactLogFlow(input: {
  sessionExercises: SessionExerciseRow[];
  workoutSets: WorkoutSetRow[];
  activeExerciseIndex: number;
  isReadOnly: boolean;
}) {
  const { sessionExercises, workoutSets, activeExerciseIndex, isReadOnly } = input;
  const [isSmallPhone, setIsSmallPhone] = useState(false);
  /** Compact single-exercise flow: show full new-set composer after target working sets are met. */
  const [compactShowExtraSetComposer, setCompactShowExtraSetComposer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsSmallPhone(mediaQuery.matches);
    apply();
    const onChange = () => apply();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setCompactShowExtraSetComposer(false);
  }, [activeExerciseIndex]);

  useEffect(() => {
    if (!isSmallPhone || isReadOnly) {
      return;
    }
    const ex = sessionExercises[activeExerciseIndex];
    if (!ex) {
      return;
    }
    if (!isTargetSetsGoalMet(ex, workoutSets)) {
      setCompactShowExtraSetComposer(false);
    }
  }, [isSmallPhone, isReadOnly, sessionExercises, activeExerciseIndex, workoutSets]);

  useEffect(() => {
    const exerciseRow = sessionExercises[activeExerciseIndex];
    if (!isSmallPhone || isReadOnly || !exerciseRow) {
      return;
    }
    const exerciseId = exerciseRow.id;
    let frame = 0;

    const scrollToNextAction = () => {
      const exercise = document.getElementById(`exercise-${exerciseId}`);
      const action = exercise?.querySelector("[data-compact-next-action]");
      if (!(action instanceof HTMLElement)) {
        return;
      }
      const sticky = document.getElementById("compact-sticky-bar");
      const lastRow = exercise?.querySelector("[data-compact-last-set]");
      const actionRect = action.getBoundingClientRect();
      const lastRect = lastRow instanceof HTMLElement ? lastRow.getBoundingClientRect() : null;
      const delta = compactLogScrollDelta({
        viewportHeight: window.innerHeight,
        stickyHeight: sticky?.getBoundingClientRect().height ?? 0,
        topInset: 0,
        actionTop: actionRect.top,
        actionBottom: actionRect.bottom,
        lastRowTop: lastRect?.top ?? null,
      });
      if (Math.abs(delta) < 4) {
        return;
      }
      window.scrollBy({ top: delta, behavior: "smooth" });
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(scrollToNextAction);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activeExerciseIndex,
    compactShowExtraSetComposer,
    isReadOnly,
    isSmallPhone,
    sessionExercises,
    workoutSets.length,
  ]);

  return { isSmallPhone, compactShowExtraSetComposer, setCompactShowExtraSetComposer };
}
