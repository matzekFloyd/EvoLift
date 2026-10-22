"use client";

import { useEffect, useState } from "react";
import { loadTargetWeightHistory } from "@/lib/target-weight-history";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  previousSessionWorkingSets,
  type LastSessionWorkingSet,
  type PreviousSessionSetSource,
} from "./last-session-set-comparison";

/**
 * Working sets from the previous session of this exercise.
 * Empty while loading, on failure, when that session has no working sets,
 * or when its performed date is more than 30 days before this session.
 */
export function usePreviousSessionWorkingSets(
  exerciseId: string | undefined,
  excludeSessionId: string | null,
  sessionPerformedOn: string,
): LastSessionWorkingSet[] {
  const [loaded, setLoaded] = useState<{
    exerciseId: string;
    sets: PreviousSessionSetSource[];
  } | null>(null);

  useEffect(() => {
    if (!exerciseId) {
      return;
    }
    let cancelled = false;
    void loadTargetWeightHistory(supabaseBrowserClient, exerciseId)
      .then((sets) => {
        if (!cancelled) {
          setLoaded({ exerciseId, sets });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ exerciseId, sets: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!exerciseId || loaded?.exerciseId !== exerciseId) {
    return [];
  }
  return previousSessionWorkingSets(loaded.sets, excludeSessionId, sessionPerformedOn);
}
