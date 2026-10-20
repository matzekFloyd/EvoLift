import type { Dispatch, SetStateAction } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { isAssistanceExercise } from "@/lib/assistance-exercise";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import {
  OTHER_SESSION_IN_PROGRESS_MESSAGE,
  canMarkSessionCompleted,
  canStartOrContinueLogging,
  wouldStartSession,
} from "@/lib/session-lifecycle";
import { isFutureSessionDate } from "@/lib/session-date";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { suggestWarmups } from "@/lib/warmup-suggestion";
import {
  compactSetNumbers,
  nextSetNumber,
  parseAddedSessionExercise,
  parseLoggedSetInput,
  parseSessionTargets,
  PLANNED_SESSION_SETS_MESSAGE,
  TARGETS_EXERCISE_MISSING,
} from "./session-input";
import {
  emptyAddExerciseDraft,
  emptySetDraft,
  exerciseLabelForSessionExercise,
  maxSessionNotesLength,
  resolvedAddDraft,
  setsForSessionExercise,
  type AddExerciseDraft,
} from "./session-detail-model";
import {
  parseYyyyMmDdDateOnly,
  SESSION_DATE_HAS_SETS,
  sessionPerformedOnError,
  canEditSetAsWarmup,
  showWarmupSetToggle,
  type SessionSetDraft,
} from "./session-set-draft";

export type SessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SessionExerciseRow = Database["public"]["Tables"]["workout_session_exercises"]["Row"];
export type WorkoutSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];

type RouterReplace = {
  replace: (href: string) => void;
};

export type SessionDetailActionDeps = {
  session: SessionRow | null;
  sessionId: string | undefined;
  sessionExercises: SessionExerciseRow[];
  workoutSets: WorkoutSetRow[];
  addDrafts: Record<string, Partial<SessionSetDraft>>;
  editDraft: SessionSetDraft;
  addExerciseDraft: AddExerciseDraft;
  targetsSets: string;
  targetsReps: string;
  targetsWeightKg: string;
  targetsSessionExerciseId: string | null;
  performedOnDraft: string;
  notesDraft: string;
  isCompactView: boolean;
  exerciseLabels: Map<string, string>;
  exerciseSlugById: Map<string, string>;
  showError: (messageText: string) => void;
  showWarning: (messageText: string) => void;
  showSuccess: (messageText: string) => void;
  clearMessage: () => void;
  router: RouterReplace;
  setIsSavingSet: Dispatch<SetStateAction<boolean>>;
  setWorkoutSets: Dispatch<SetStateAction<WorkoutSetRow[]>>;
  setAddDrafts: Dispatch<SetStateAction<Record<string, Partial<SessionSetDraft>>>>;
  setCompactShowExtraSetComposer: Dispatch<SetStateAction<boolean>>;
  setPendingCompactSetFocusSessionExerciseId: Dispatch<SetStateAction<string | null>>;
  setEditingSetId: Dispatch<SetStateAction<string | null>>;
  setEditDraft: Dispatch<SetStateAction<SessionSetDraft>>;
  setIsDeleteSessionConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setIsDeletingSession: Dispatch<SetStateAction<boolean>>;
  setSessionExercises: Dispatch<SetStateAction<SessionExerciseRow[]>>;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
  setIsAddExerciseSheetOpen: Dispatch<SetStateAction<boolean>>;
  setAddExerciseDraft: Dispatch<SetStateAction<AddExerciseDraft>>;
  setIsAddingExercise: Dispatch<SetStateAction<boolean>>;
  markSkipNextExerciseMessageClear: () => void;
  setTargetsSessionExerciseId: Dispatch<SetStateAction<string | null>>;
  setTargetsSets: Dispatch<SetStateAction<string>>;
  setTargetsReps: Dispatch<SetStateAction<string>>;
  setTargetsWeightKg: Dispatch<SetStateAction<string>>;
  setIsTargetsSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIsSavingTargets: Dispatch<SetStateAction<boolean>>;
  setPerformedOnDraft: Dispatch<SetStateAction<string>>;
  setNotesDraft: Dispatch<SetStateAction<string>>;
  setSessionDetailsDateError: Dispatch<SetStateAction<string | null>>;
  setSessionDetailsNotesError: Dispatch<SetStateAction<string | null>>;
  setIsEditingSessionDetails: Dispatch<SetStateAction<boolean>>;
  setIsSavingSessionDetails: Dispatch<SetStateAction<boolean>>;
  setSession: Dispatch<SetStateAction<SessionRow | null>>;
  setIsMarkingCompleted: Dispatch<SetStateAction<boolean>>;
  /** Exercise ids whose account preference turns warmup suggestions off. */
  warmupSuggestionsDisabledExerciseIds: ReadonlySet<string>;
  /** Per-exercise cap; missing or null keeps the full warmup ladder. */
  maxWarmupSetsByExerciseId: ReadonlyMap<string, number | null>;
};

export function createSessionDetailActions(deps: SessionDetailActionDeps) {
  const {
    session,
    sessionId,
    sessionExercises,
    workoutSets,
    addDrafts,
    editDraft,
    addExerciseDraft,
    targetsSets,
    targetsReps,
    targetsWeightKg,
    targetsSessionExerciseId,
    performedOnDraft,
    notesDraft,
    isCompactView,
    exerciseLabels,
    exerciseSlugById,
    showError,
    showWarning,
    showSuccess,
    clearMessage,
    router,
    setIsSavingSet,
    setWorkoutSets,
    setAddDrafts,
    setCompactShowExtraSetComposer,
    setPendingCompactSetFocusSessionExerciseId,
    setEditingSetId,
    setEditDraft,
    setIsDeleteSessionConfirmOpen,
    setIsDeletingSession,
    setSessionExercises,
    setActiveExerciseIndex,
    setIsAddExerciseSheetOpen,
    setAddExerciseDraft,
    setIsAddingExercise,
    markSkipNextExerciseMessageClear,
    setTargetsSessionExerciseId,
    setTargetsSets,
    setTargetsReps,
    setTargetsWeightKg,
    setIsTargetsSheetOpen,
    setIsSavingTargets,
    setPerformedOnDraft,
    setNotesDraft,
    setSessionDetailsDateError,
    setSessionDetailsNotesError,
    setIsEditingSessionDetails,
    setIsSavingSessionDetails,
    setSession,
    setIsMarkingCompleted,
    warmupSuggestionsDisabledExerciseIds,
    maxWarmupSetsByExerciseId,
  } = deps;

  function labelFor(sessionExerciseId: string) {
    return exerciseLabelForSessionExercise(sessionExercises, exerciseLabels, sessionExerciseId);
  }

  function lifecycleFields(row: SessionRow) {
    return {
      performedOn: row.performed_on,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  async function findOtherInProgressSessionId(currentSessionId: string): Promise<string | null> {
    const { data, error } = await supabaseBrowserClient
      .from("workout_sessions")
      .select("id")
      .not("started_at", "is", null)
      .is("completed_at", null)
      .neq("id", currentSessionId)
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return data.id;
  }

  /**
   * Enforces one in-progress session and sets started_at on the first logged set.
   * Returns false when the caller should abort the set insert.
   */
  async function prepareSessionForLogging(): Promise<boolean> {
    if (!session || !sessionId) {
      return false;
    }
    if (isFutureSessionDate(session.performed_on)) {
      showWarning(PLANNED_SESSION_SETS_MESSAGE);
      return false;
    }

    const fields = lifecycleFields(session);
    const otherInProgressSessionId = wouldStartSession(fields)
      ? await findOtherInProgressSessionId(sessionId)
      : null;

    const gate = canStartOrContinueLogging({
      targetSessionId: sessionId,
      target: fields,
      otherInProgressSessionId,
    });
    if (!gate.ok) {
      showError(gate.message);
      return false;
    }

    if (!wouldStartSession(fields)) {
      return true;
    }

    const startedAt = new Date().toISOString();
    const { data, error } = await supabaseBrowserClient
      .from("workout_sessions")
      .update({ started_at: startedAt })
      .eq("id", sessionId)
      .is("started_at", null)
      .select(
        "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, started_at, completed_at",
      )
      .maybeSingle();

    if (error) {
      if (/idx_workout_sessions_one_in_progress|unique/i.test(error.message)) {
        showError(OTHER_SESSION_IN_PROGRESS_MESSAGE);
      } else {
        showError(`Could not start this workout session: ${error.message}`);
      }
      return false;
    }

    if (data) {
      setSession(data);
    } else {
      // Another request may have started this session; reload started_at.
      const { data: refreshed } = await supabaseBrowserClient
        .from("workout_sessions")
        .select(
          "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, started_at, completed_at",
        )
        .eq("id", sessionId)
        .single();
      if (refreshed) {
        setSession(refreshed);
      }
    }

    invalidateLoggedHistoryCaches();
    return true;
  }

  async function handleAddSet(sessionExerciseId: string) {
    const draft = resolvedAddDraft(sessionExercises, workoutSets, addDrafts, sessionExerciseId);
    const logged = parseLoggedSetInput(draft.reps, draft.weightKg);
    if (!logged.ok) {
      showError(logged.message);
      return;
    }

    const existingSets = setsForSessionExercise(workoutSets, sessionExerciseId);
    const setNumber = nextSetNumber(existingSets.map((set) => set.set_number));
    const previousSet = existingSets[existingSets.length - 1] ?? null;
    const isWarmup = showWarmupSetToggle(previousSet?.is_warmup ?? null) && draft.isWarmup;

    setIsSavingSet(true);
    const prepared = await prepareSessionForLogging();
    if (!prepared) {
      setIsSavingSet(false);
      return;
    }

    const { data, error } = await supabaseBrowserClient
      .from("workout_sets")
      .insert({
        session_exercise_id: sessionExerciseId,
        set_number: setNumber,
        reps: logged.reps,
        weight_kg: logged.weightKg,
        is_warmup: isWarmup,
      })
      .select("*")
      .single();

    if (error || !data) {
      showError(`Could not add set: ${error?.message ?? "Unknown error"}`);
      setIsSavingSet(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setWorkoutSets((prev) => [...prev, data]);
    const sessionExercise = sessionExercises.find((item) => item.id === sessionExerciseId);
    const mergedForExercise = [...setsForSessionExercise(workoutSets, sessionExerciseId), data].sort(
      (a, b) => a.set_number - b.set_number,
    );
    const nextWorkingSetCount = mergedForExercise.filter((set) => !set.is_warmup).length;
    const nextTargetSetsGoal = sessionExercise?.target_sets ?? null;
    const nextTargetSetsMet =
      nextTargetSetsGoal != null && nextTargetSetsGoal > 0 && nextWorkingSetCount >= nextTargetSetsGoal;
    if (isCompactView && nextTargetSetsMet) {
      setCompactShowExtraSetComposer(true);
    }
    const nextSuggested = resolvedAddDraft(
      sessionExercise ? [sessionExercise] : [],
      mergedForExercise,
      {},
      sessionExerciseId,
    );
    setAddDrafts((prev) => ({
      ...prev,
      [sessionExerciseId]: nextSuggested,
    }));
    showSuccess(`Set ${data.set_number} added for ${labelFor(sessionExerciseId)}.`);
    if (isCompactView) {
      setCompactShowExtraSetComposer(true);
      setPendingCompactSetFocusSessionExerciseId(sessionExerciseId);
    }
    setIsSavingSet(false);
  }

  async function handleAddWarmups(sessionExerciseId: string) {
    const existingSets = setsForSessionExercise(workoutSets, sessionExerciseId);
    if (existingSets.length > 0) {
      return;
    }

    const sessionExercise = sessionExercises.find((item) => item.id === sessionExerciseId);
    if (sessionExercise && warmupSuggestionsDisabledExerciseIds.has(sessionExercise.exercise_id)) {
      return;
    }
    const suggestion = suggestWarmups({
      targetWeightKg: sessionExercise?.target_weight_kg ?? null,
      baseWeightKg: sessionExercise?.base_weight_kg ?? null,
      maxSteps: sessionExercise
        ? (maxWarmupSetsByExerciseId.get(sessionExercise.exercise_id) ?? null)
        : null,
    });
    if (suggestion.status !== "steps" || suggestion.steps.length === 0) {
      return;
    }

    setIsSavingSet(true);
    const prepared = await prepareSessionForLogging();
    if (!prepared) {
      setIsSavingSet(false);
      return;
    }

    const rows = suggestion.steps.map((step, index) => ({
      session_exercise_id: sessionExerciseId,
      set_number: index + 1,
      reps: step.reps,
      weight_kg: step.loadedKg,
      is_warmup: true,
    }));

    const { data, error } = await supabaseBrowserClient.from("workout_sets").insert(rows).select("*");

    if (error || !data || data.length === 0) {
      showError(`Could not add warmups: ${error?.message ?? "Unknown error"}`);
      setIsSavingSet(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setWorkoutSets((prev) => [...prev, ...data]);
    showSuccess(`Warmups added for ${labelFor(sessionExerciseId)}.`);
    setIsSavingSet(false);
  }

  function startEdit(set: WorkoutSetRow) {
    setEditingSetId(set.id);
    setEditDraft({
      reps: String(set.reps),
      weightKg: set.weight_kg == null ? "" : String(set.weight_kg),
      isWarmup: set.is_warmup,
    });
  }

  function cancelEdit() {
    setEditingSetId(null);
    setEditDraft(emptySetDraft);
  }

  async function saveEdit(setId: string) {
    const logged = parseLoggedSetInput(editDraft.reps, editDraft.weightKg);
    if (!logged.ok) {
      showError(logged.message);
      return;
    }

    const edited = workoutSets.find((set) => set.id === setId);
    const exerciseSets = edited
      ? setsForSessionExercise(workoutSets, edited.session_exercise_id)
      : [];
    const isWarmup = canEditSetAsWarmup(exerciseSets, setId) && editDraft.isWarmup;

    setIsSavingSet(true);

    const { data, error } = await supabaseBrowserClient
      .from("workout_sets")
      .update({
        reps: logged.reps,
        weight_kg: logged.weightKg,
        is_warmup: isWarmup,
      })
      .eq("id", setId)
      .select("*")
      .single();

    if (error || !data) {
      showError(`Could not update set: ${error?.message ?? "Unknown error"}`);
      setIsSavingSet(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    const previousSet = workoutSets.find((item) => item.id === setId);
    const exerciseLabel = previousSet ? labelFor(previousSet.session_exercise_id) : "exercise";
    setWorkoutSets((prev) => prev.map((item) => (item.id === setId ? data : item)));
    setEditingSetId(null);
    setEditDraft(emptySetDraft);
    showSuccess(`Set ${data.set_number} updated for ${exerciseLabel}.`);
    setIsSavingSet(false);
  }

  async function deleteSet(setId: string) {
    setIsSavingSet(true);

    const deletedSet = workoutSets.find((set) => set.id === setId);
    const { error } = await supabaseBrowserClient.from("workout_sets").delete().eq("id", setId);
    if (error) {
      showError(`Could not delete set: ${error.message}`);
      setIsSavingSet(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    const renumberedById = new Map<string, WorkoutSetRow>();
    if (deletedSet) {
      const remaining = setsForSessionExercise(workoutSets, deletedSet.session_exercise_id).filter(
        (set) => set.id !== setId,
      );
      for (const update of compactSetNumbers(remaining)) {
        const { data, error: renumberError } = await supabaseBrowserClient
          .from("workout_sets")
          .update({ set_number: update.setNumber })
          .eq("id", update.id)
          .select("*")
          .single();
        if (renumberError || !data) {
          showError(`Could not renumber sets: ${renumberError?.message ?? "Unknown error"}`);
          setWorkoutSets((prev) =>
            prev
              .filter((set) => set.id !== setId)
              .map((set) => renumberedById.get(set.id) ?? set),
          );
          setIsSavingSet(false);
          return;
        }
        renumberedById.set(update.id, data);
      }
    }
    setWorkoutSets((prev) =>
      prev.filter((set) => set.id !== setId).map((set) => renumberedById.get(set.id) ?? set),
    );
    if (deletedSet) {
      const sessionExerciseId = deletedSet.session_exercise_id;
      const setsBefore = setsForSessionExercise(workoutSets, sessionExerciseId);
      const setsAfter = setsBefore.filter((set) => set.id !== setId);
      const sessionExercise = sessionExercises.find((item) => item.id === sessionExerciseId);
      const autoBefore = resolvedAddDraft(
        sessionExercise ? [sessionExercise] : [],
        setsBefore,
        {},
        sessionExerciseId,
      );
      const autoAfter = resolvedAddDraft(
        sessionExercise ? [sessionExercise] : [],
        setsAfter,
        {},
        sessionExerciseId,
      );
      const addDefaultsChanged =
        autoBefore.reps !== autoAfter.reps ||
        autoBefore.weightKg !== autoAfter.weightKg ||
        autoBefore.isWarmup !== autoAfter.isWarmup;

      if (addDefaultsChanged) {
        setAddDrafts((prev) => {
          const next = { ...prev };
          delete next[sessionExerciseId];
          return next;
        });
      }

      showSuccess(`Set ${deletedSet.set_number} deleted from ${labelFor(sessionExerciseId)}.`);
    } else {
      showSuccess("Set deleted.");
    }
    setIsSavingSet(false);
  }

  async function deleteSession() {
    if (!sessionId) {
      return;
    }
    setIsDeleteSessionConfirmOpen(false);
    setIsDeletingSession(true);
    clearMessage();

    const sessionExerciseIds = sessionExercises.map((item) => item.id);
    if (sessionExerciseIds.length > 0) {
      const { error: setsDeleteError } = await supabaseBrowserClient
        .from("workout_sets")
        .delete()
        .in("session_exercise_id", sessionExerciseIds);
      if (setsDeleteError) {
        showError(`Could not delete workout sets: ${setsDeleteError.message}`);
        setIsDeletingSession(false);
        return;
      }

      const { error: sessionExercisesDeleteError } = await supabaseBrowserClient
        .from("workout_session_exercises")
        .delete()
        .eq("session_id", sessionId);
      if (sessionExercisesDeleteError) {
        showError(`Could not delete session exercises: ${sessionExercisesDeleteError.message}`);
        setIsDeletingSession(false);
        return;
      }
    }

    const { error: sessionDeleteError } = await supabaseBrowserClient
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId);
    if (sessionDeleteError) {
      showError(`Could not delete workout session: ${sessionDeleteError.message}`);
      setIsDeletingSession(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    router.replace("/");
  }

  async function addExerciseToSession() {
    if (!sessionId) {
      return;
    }
    const added = parseAddedSessionExercise({
      exerciseId: addExerciseDraft.exerciseId,
      alreadyInSession: sessionExercises.some((row) => row.exercise_id === addExerciseDraft.exerciseId),
      targetSets: addExerciseDraft.targetSets,
      targetReps: addExerciseDraft.targetReps,
      targetWeightKg: addExerciseDraft.targetWeightKg,
      baseWeightKg: addExerciseDraft.baseWeightKg,
      omitBaseWeight: isAssistanceExercise(
        exerciseSlugById.get(addExerciseDraft.exerciseId),
      ),
    });
    if (!added.ok) {
      if (added.tone === "warning") {
        showWarning(added.message);
      } else {
        showError(added.message);
      }
      return;
    }

    const nextPosition =
      sessionExercises.length > 0 ? Math.max(...sessionExercises.map((row) => row.position)) + 1 : 1;

    setIsAddingExercise(true);

    const { data, error } = await supabaseBrowserClient
      .from("workout_session_exercises")
      .insert({
        session_id: sessionId,
        exercise_id: addExerciseDraft.exerciseId,
        position: nextPosition,
        base_weight_kg: added.baseWeightKg,
        target_sets: added.targetSets,
        target_reps: added.targetReps,
        target_weight_kg: added.targetWeightKg,
        notes: addExerciseDraft.notes.trim() ? addExerciseDraft.notes.trim() : null,
      })
      .select("*")
      .single();

    if (error || !data) {
      showError(`Could not add exercise: ${error?.message ?? "Unknown error"}`);
      setIsAddingExercise(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setSessionExercises((prev) => [...prev, data].sort((a, b) => a.position - b.position));
    if (isCompactView) {
      markSkipNextExerciseMessageClear();
      setActiveExerciseIndex(sessionExercises.length);
      setIsAddExerciseSheetOpen(false);
    }
    showSuccess("Exercise added to session.");
    setAddExerciseDraft(emptyAddExerciseDraft);
    setIsAddingExercise(false);
  }

  function startTargetsEdit(sessionExercise: SessionExerciseRow, mode: "inline" | "sheet") {
    setTargetsSessionExerciseId(sessionExercise.id);
    setTargetsSets(sessionExercise.target_sets == null ? "" : String(sessionExercise.target_sets));
    setTargetsReps(sessionExercise.target_reps == null ? "" : String(sessionExercise.target_reps));
    setTargetsWeightKg(
      sessionExercise.target_weight_kg == null ? "" : String(sessionExercise.target_weight_kg),
    );
    setIsTargetsSheetOpen(mode === "sheet");
  }

  function cancelTargetsEdit() {
    setIsTargetsSheetOpen(false);
    setTargetsSessionExerciseId(null);
  }

  async function saveTargetsForExercise() {
    if (!targetsSessionExerciseId) {
      showError(TARGETS_EXERCISE_MISSING);
      return;
    }

    const targets = parseSessionTargets({
      targetSets: targetsSets,
      targetReps: targetsReps,
      targetWeightKg: targetsWeightKg,
    });
    if (!targets.ok) {
      showError(targets.message);
      return;
    }

    setIsSavingTargets(true);

    const { data, error } = await supabaseBrowserClient
      .from("workout_session_exercises")
      .update({
        target_sets: targets.targetSets,
        target_reps: targets.targetReps,
        target_weight_kg: targets.targetWeightKg,
      })
      .eq("id", targetsSessionExerciseId)
      .select("*")
      .single();

    if (error || !data) {
      showError(`Could not update targets: ${error?.message ?? "Unknown error"}`);
      setIsSavingTargets(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setSessionExercises((prev) => prev.map((item) => (item.id === targetsSessionExerciseId ? data : item)));
    setIsSavingTargets(false);
    setIsTargetsSheetOpen(false);
    setTargetsSessionExerciseId(null);
    showSuccess(`Targets updated for ${labelFor(targetsSessionExerciseId)}.`);
  }

  function beginEditingSessionDetails() {
    if (!session) {
      return;
    }
    setPerformedOnDraft(session.performed_on);
    setNotesDraft(session.notes ?? "");
    setSessionDetailsDateError(null);
    setSessionDetailsNotesError(null);
    setIsEditingSessionDetails(true);
  }

  function cancelEditingSessionDetails() {
    if (!session) {
      setIsEditingSessionDetails(false);
      return;
    }
    setPerformedOnDraft(session.performed_on);
    setNotesDraft(session.notes ?? "");
    setSessionDetailsDateError(null);
    setSessionDetailsNotesError(null);
    setIsEditingSessionDetails(false);
  }

  async function saveSessionDetails() {
    if (!sessionId || !session) {
      return;
    }

    setSessionDetailsDateError(null);
    setSessionDetailsNotesError(null);

    const parsedDate = parseYyyyMmDdDateOnly(performedOnDraft);
    if (!parsedDate) {
      setSessionDetailsDateError(sessionPerformedOnError(performedOnDraft));
      return;
    }

    if (workoutSets.length > 0 && isFutureSessionDate(parsedDate)) {
      setSessionDetailsDateError(SESSION_DATE_HAS_SETS);
      return;
    }

    if (notesDraft.length > maxSessionNotesLength) {
      setSessionDetailsNotesError(
        `Session notes cannot be longer than ${maxSessionNotesLength} characters.`,
      );
      return;
    }

    const notesTrimmed = notesDraft.trim();
    const notesPayload = notesTrimmed.length > 0 ? notesTrimmed : null;

    setIsSavingSessionDetails(true);
    clearMessage();

    const { data, error } = await supabaseBrowserClient
      .from("workout_sessions")
      .update({
        performed_on: parsedDate,
        notes: notesPayload,
      })
      .eq("id", sessionId)
      .select(
        "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, started_at, completed_at",
      )
      .single();

    if (error || !data) {
      const msg = error?.message ?? "Unknown error";
      if (/row level security|rls|permission denied|violates row-level/i.test(msg)) {
        showError("You can only update your own workout sessions.");
      } else {
        showError(`Could not update session: ${msg}`);
      }
      setIsSavingSessionDetails(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setSession(data);
    setPerformedOnDraft(data.performed_on);
    setNotesDraft(data.notes ?? "");
    setIsEditingSessionDetails(false);
    showSuccess("Session date and notes saved.");
    setIsSavingSessionDetails(false);
  }

  async function markSessionCompleted() {
    if (!session || !sessionId) {
      return;
    }
    if (!canMarkSessionCompleted(lifecycleFields(session))) {
      showWarning("This workout session is already completed or still upcoming.");
      return;
    }

    setIsMarkingCompleted(true);
    const completedAt = new Date().toISOString();
    const { data, error } = await supabaseBrowserClient
      .from("workout_sessions")
      .update({ completed_at: completedAt })
      .eq("id", sessionId)
      .is("completed_at", null)
      .select(
        "id, user_id, performed_on, notes, created_at, updated_at, source_template_id, plan_id, plan_day_id, started_at, completed_at",
      )
      .maybeSingle();

    if (error) {
      showError(`Could not mark this session completed: ${error.message}`);
      setIsMarkingCompleted(false);
      return;
    }

    if (!data) {
      showWarning("This workout session is already completed.");
      setIsMarkingCompleted(false);
      return;
    }

    invalidateLoggedHistoryCaches();
    setSession(data);
    showSuccess("Workout session marked completed.");
    setIsMarkingCompleted(false);
  }

  return {
    handleAddSet,
    handleAddWarmups,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteSet,
    deleteSession,
    addExerciseToSession,
    startTargetsEdit,
    cancelTargetsEdit,
    saveTargetsForExercise,
    beginEditingSessionDetails,
    cancelEditingSessionDetails,
    saveSessionDetails,
    markSessionCompleted,
  };
}
