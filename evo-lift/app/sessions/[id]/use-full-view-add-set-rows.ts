"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionExerciseRow, WorkoutSetRow } from "./session-detail-actions";
import { isTargetSetsGoalMet } from "./session-detail-model";

/** Full (md+) table: session_exercise ids where the add-set row stays open past target. */
export function useFullViewAddSetRows(input: {
  sessionId: string | undefined;
  sessionExercises: SessionExerciseRow[];
  workoutSets: WorkoutSetRow[];
}) {
  const { sessionId, sessionExercises, workoutSets } = input;
  const [fullViewExpandAddSetRowIds, setFullViewExpandAddSetRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setFullViewExpandAddSetRowIds(new Set());
  }, [sessionId]);

  useEffect(() => {
    setFullViewExpandAddSetRowIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set<string>();
      for (const id of prev) {
        const ex = sessionExercises.find((e) => e.id === id);
        if (ex && isTargetSetsGoalMet(ex, workoutSets)) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [sessionExercises, workoutSets]);

  const expandFullAddSetRow = useCallback((sessionExerciseId: string) => {
    setFullViewExpandAddSetRowIds((prev) => {
      const next = new Set(prev);
      next.add(sessionExerciseId);
      return next;
    });
  }, []);

  return { fullViewExpandAddSetRowIds, expandFullAddSetRow };
}
