"use client";

import { useEffect } from "react";
import {
  getExerciseMetadataCacheStatus,
  loadExerciseMetadata,
} from "@/lib/exercise-metadata-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** Best-effort catalog warm-up for signed-in pages. Login does not load this module. */
export function ExerciseMetadataWarmup() {
  useEffect(() => {
    const startedAt = performance.now();
    const cacheStatus = getExerciseMetadataCacheStatus(5 * 60 * 1000);
    void loadExerciseMetadata(supabaseBrowserClient, { ttlMs: 5 * 60 * 1000 })
      .then(() => {
        const elapsedMs = Number((performance.now() - startedAt).toFixed(1));
        console.info(`[Perf] exercise metadata warm-up ${cacheStatus} in ${elapsedMs}ms`);
      })
      .catch(() => {
        const elapsedMs = Number((performance.now() - startedAt).toFixed(1));
        console.info(`[Perf] exercise metadata warm-up failed after ${elapsedMs}ms`);
      });
  }, []);

  return null;
}
