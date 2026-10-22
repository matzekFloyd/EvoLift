"use client";

import { useEffect, useState } from "react";
import { loadTargetWeightHistory } from "@/lib/target-weight-history";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  previousSessionWorkingSets,
  type LastSessionWorkingSet,
} from "./last-session-set-comparison";

/**
 * Working sets from the previous session of this exercise.
 * Empty while loading, on failure, or when that session has no working sets.
 */
export function usePreviousSessionWorkingSets(
  exerciseId: string | undefined,
  excludeSessionId: string | null,
): LastSessionWorkingSet[] {
  const [loaded, setLoaded] = useState<{
    exerciseId: string;
    excludeSessionId: string | null;
    sets: LastSessionWorkingSet[];
  } | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      return;
    }
    let cancelled = false;
    void loadTargetWeightHistory(supabaseBrowserClient, exerciseId)
      .then((sets) => {
        if (!cancelled) {
          setLoaded({
            exerciseId,
            excludeSessionId,
            sets: previousSessionWorkingSets(sets, excludeSessionId),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ exerciseId, excludeSessionId, sets: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, excludeSessionId]);

  if (
    !exerciseId ||
    loaded?.exerciseId !== exerciseId ||
    loaded.excludeSessionId !== excludeSessionId
  ) {
    return [];
  }
  return loaded.sets;
}
