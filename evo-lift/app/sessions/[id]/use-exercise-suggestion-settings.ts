"use client";

import { useEffect, useMemo, useState } from "react";
import { isCompoundExercise } from "@/lib/compound-exercise";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";

/** Per-exercise account preferences for warmup and target-weight suggestions. */
export function useExerciseSuggestionSettings(
  userId: string | undefined,
  exerciseOptions: Array<{ id: string; slug: string }>,
) {
  const [suggestWarmupsByExerciseId, setSuggestWarmupsByExerciseId] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [targetSuggestionsDisabledExerciseIds, setTargetSuggestionsDisabledExerciseIds] = useState<
    Set<string>
  >(() => new Set());
  const [maxWarmupSetsByExerciseId, setMaxWarmupSetsByExerciseId] = useState<Map<string, number | null>>(
    () => new Map(),
  );

  const warmupSuggestionsDisabledExerciseIds = useMemo(() => {
    const disabled = new Set<string>();
    for (const option of exerciseOptions) {
      const stored = suggestWarmupsByExerciseId.has(option.id)
        ? suggestWarmupsByExerciseId.get(option.id)
        : undefined;
      if (!warmupSuggestionsEnabled(stored, isCompoundExercise(option.slug))) {
        disabled.add(option.id);
      }
    }
    return disabled;
  }, [exerciseOptions, suggestWarmupsByExerciseId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const scopedUserId: string = userId;
    let cancelled = false;

    async function loadSuggestionSettings() {
      const { data: defaults } = await supabaseBrowserClient
        .from("user_exercise_defaults")
        .select("exercise_id, suggest_warmups, suggest_target, max_suggested_warmup_sets")
        .eq("user_id", scopedUserId);
      if (cancelled) {
        return;
      }
      const warmupByExercise = new Map<string, boolean>();
      const maxWarmupByExercise = new Map<string, number | null>();
      const targetDisabled = new Set<string>();
      for (const row of defaults ?? []) {
        warmupByExercise.set(row.exercise_id, row.suggest_warmups);
        maxWarmupByExercise.set(row.exercise_id, row.max_suggested_warmup_sets);
        if (row.suggest_target === false) {
          targetDisabled.add(row.exercise_id);
        }
      }
      setSuggestWarmupsByExerciseId(warmupByExercise);
      setMaxWarmupSetsByExerciseId(maxWarmupByExercise);
      setTargetSuggestionsDisabledExerciseIds(targetDisabled);
    }
    void loadSuggestionSettings();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    warmupSuggestionsDisabledExerciseIds,
    targetSuggestionsDisabledExerciseIds,
    maxWarmupSetsByExerciseId,
  };
}
