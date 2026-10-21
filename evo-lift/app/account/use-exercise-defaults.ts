import { useEffect, useState } from "react";
import type { AccountProfileSnapshot } from "@/lib/account-profile-cache";
import { isCompoundExercise } from "@/lib/compound-exercise";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { refillAccountCache } from "@/app/account/account-cache";
import {
  exerciseDefaultsClearError,
  exerciseDefaultsSaveError,
  parseMaxWarmupSets,
} from "@/app/account/account-form";
import { exerciseDefaultsFormValues } from "@/app/account/account-profile-form";
import type { AccountSectionId } from "@/app/account/account-section";
import { useAccountNotice } from "@/app/account/use-account-notice";

export function useExerciseDefaults({
  userId,
  exerciseOptions,
  cachedAccount,
  activeSection,
}: {
  userId: string | null;
  exerciseOptions: AccountProfileSnapshot["exerciseOptions"];
  cachedAccount: AccountProfileSnapshot | null;
  activeSection: AccountSectionId;
}) {
  const [defaultsByExerciseId, setDefaultsByExerciseId] = useState<
    Map<string, Database["public"]["Tables"]["user_exercise_defaults"]["Row"]>
  >(() => new Map((cachedAccount?.defaults ?? []).map((row) => [row.exercise_id, row])));
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [defaultBaseWeightKg, setDefaultBaseWeightKg] = useState("");
  const [defaultTargetSets, setDefaultTargetSets] = useState("");
  const [defaultTargetReps, setDefaultTargetReps] = useState("");
  const [defaultTargetWeightKg, setDefaultTargetWeightKg] = useState("");
  const [maxWarmupSets, setMaxWarmupSets] = useState("");
  const [suggestWarmups, setSuggestWarmups] = useState(true);
  const [suggestTarget, setSuggestTarget] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const notice = useAccountNotice("success");
  const clearNotice = notice.clear;

  function applySnapshot(snapshot: AccountProfileSnapshot) {
    setDefaultsByExerciseId(new Map(snapshot.defaults.map((row) => [row.exercise_id, row])));
  }

  useEffect(() => {
    clearNotice();
  }, [selectedExerciseId, clearNotice]);

  useEffect(() => {
    const values = exerciseDefaultsFormValues({
      saved: defaultsByExerciseId.get(selectedExerciseId),
      exerciseId: selectedExerciseId,
      slug: exerciseOptions.find((option) => option.id === selectedExerciseId)?.slug,
    });
    setDefaultBaseWeightKg(values.baseWeightKg);
    setDefaultTargetSets(values.targetSets);
    setDefaultTargetReps(values.targetReps);
    setDefaultTargetWeightKg(values.targetWeightKg);
    setSuggestWarmups(values.suggestWarmups);
    setSuggestTarget(values.suggestTarget);
    setMaxWarmupSets(values.maxWarmupSets);
  }, [defaultsByExerciseId, exerciseOptions, selectedExerciseId]);

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const defaultsError = exerciseDefaultsSaveError({
      userId,
      exerciseId: selectedExerciseId,
      baseWeightKg: defaultBaseWeightKg,
      targetSets: defaultTargetSets,
      targetReps: defaultTargetReps,
      targetWeightKg: defaultTargetWeightKg,
      maxWarmupSets,
    });
    if (defaultsError || !userId || !selectedExerciseId) {
      if (defaultsError) {
        notice.show("error", defaultsError);
      }
      return;
    }
    notice.clear();

    const parsedBaseWeight = defaultBaseWeightKg ? Number(defaultBaseWeightKg) : null;
    const parsedTargetSets = defaultTargetSets ? Number(defaultTargetSets) : null;
    const parsedTargetReps = defaultTargetReps ? Number(defaultTargetReps) : null;
    const parsedTargetWeight = defaultTargetWeightKg ? Number(defaultTargetWeightKg) : null;
    const parsedMaxWarmupSets = parseMaxWarmupSets(maxWarmupSets);

    setIsSaving(true);
    notice.clear();

    const payload: Database["public"]["Tables"]["user_exercise_defaults"]["Insert"] = {
      user_id: userId,
      exercise_id: selectedExerciseId,
      default_base_weight_kg: parsedBaseWeight,
      default_target_sets: parsedTargetSets,
      default_target_reps: parsedTargetReps,
      default_target_weight_kg: parsedTargetWeight,
      suggest_warmups: suggestWarmups,
      suggest_target: suggestTarget,
      max_suggested_warmup_sets: parsedMaxWarmupSets,
    };

    const { data, error } = await supabaseBrowserClient
      .from("user_exercise_defaults")
      .upsert(payload, { onConflict: "user_id,exercise_id" })
      .select("*")
      .single();

    if (error || !data) {
      notice.show("error", `Could not save exercise defaults: ${error?.message ?? "Unknown error"}`);
      setIsSaving(false);
      return;
    }

    setDefaultsByExerciseId((prev) => {
      const next = new Map(prev);
      next.set(data.exercise_id, data);
      return next;
    });
    const selectedExerciseLabel =
      exerciseOptions.find((option) => option.id === selectedExerciseId)?.label ?? "Exercise";
    notice.show("success", `Defaults saved for ${selectedExerciseLabel}.`);
    refillAccountCache(userId);
    setIsSaving(false);
  }

  async function handleClear() {
    const clearError = exerciseDefaultsClearError(userId, selectedExerciseId);
    if (clearError || !userId || !selectedExerciseId) {
      if (clearError) {
        notice.show("error", clearError);
      }
      return;
    }
    notice.clear();

    setIsClearing(true);
    notice.clear();

    const selectedSlug = exerciseOptions.find((option) => option.id === selectedExerciseId)?.slug;
    const suggestWarmupsDefault = isCompoundExercise(selectedSlug);
    const payload: Database["public"]["Tables"]["user_exercise_defaults"]["Insert"] = {
      user_id: userId,
      exercise_id: selectedExerciseId,
      default_base_weight_kg: null,
      default_target_sets: null,
      default_target_reps: null,
      default_target_weight_kg: null,
      suggest_warmups: suggestWarmupsDefault,
      suggest_target: true,
      max_suggested_warmup_sets: null,
    };

    const { data, error } = await supabaseBrowserClient
      .from("user_exercise_defaults")
      .upsert(payload, { onConflict: "user_id,exercise_id" })
      .select("*")
      .single();

    if (error || !data) {
      notice.show("error", `Could not clear exercise defaults: ${error?.message ?? "Unknown error"}`);
      setIsClearing(false);
      return;
    }

    setDefaultsByExerciseId((prev) => {
      const next = new Map(prev);
      next.set(data.exercise_id, data);
      return next;
    });
    setDefaultBaseWeightKg("");
    setDefaultTargetSets("");
    setDefaultTargetReps("");
    setDefaultTargetWeightKg("");
    setSuggestWarmups(suggestWarmupsDefault);
    setSuggestTarget(true);
    setMaxWarmupSets("");
    notice.clear();
    refillAccountCache(userId);
    setIsClearing(false);
  }

  return {
    selectedExerciseId,
    setSelectedExerciseId,
    defaultBaseWeightKg,
    setDefaultBaseWeightKg,
    defaultTargetSets,
    setDefaultTargetSets,
    defaultTargetReps,
    setDefaultTargetReps,
    defaultTargetWeightKg,
    setDefaultTargetWeightKg,
    maxWarmupSets,
    setMaxWarmupSets,
    suggestWarmups,
    setSuggestWarmups,
    suggestTarget,
    setSuggestTarget,
    isSaving,
    isClearing,
    notice,
    applySnapshot,
    handleSave,
    handleClear,
  };
}

export type ExerciseDefaultsState = ReturnType<typeof useExerciseDefaults>;
