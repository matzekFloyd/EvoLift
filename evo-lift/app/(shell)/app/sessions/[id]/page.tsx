"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  peekOpenedSession,
  type OpenedSessionSnapshot,
} from "@/lib/opened-session-cache";
import { rememberedUserId } from "@/lib/signed-in-memory";
import { ActionButton } from "@/app/components/action-button";
import { DocumentTitle } from "@/app/components/document-title";
import { ContentPlaceholder } from "@/app/components/content-placeholder";
import {
  SESSION_LOG_PLACEHOLDER_CLASS,
  SESSION_LOG_PLACEHOLDER_ROWS,
} from "@/app/components/content-placeholder-layout";
import { PageShell } from "@/app/components/page-shell";
import { panelInsetClass } from "@/app/components/panel-inset";
import { StatusNotice } from "@/app/components/status-notice";
import { formatDateOnlyForLocale } from "@/lib/date-format";
import { workoutSessionPageTitle } from "@/lib/page-title";
import { toExerciseBadge } from "@/lib/exercise-badge";
import { exerciseOptionsForPicker } from "@/lib/exercise-picker-options";
import {
  canMarkSessionCompleted,
  canUndoSessionCompleted,
  sessionLifecycleStatus,
  sessionIsReadOnly,
} from "@/lib/session-lifecycle";
import { isFutureSessionDate } from "@/lib/session-date";
import {
  createSessionDetailActions,
  type SessionExerciseRow,
  type SessionRow,
  type WorkoutSetRow,
} from "@/app/sessions/[id]/session-detail-actions";
import {
  emptyAddExerciseDraft,
  emptySetDraft,
  isSessionDetailsDirty,
  isTargetSetsGoalMet,
  resolveTargetsExercise,
  stickyNextLabel,
  visibleExerciseEntries,
  type AddExerciseDraft,
  type MessageTone,
} from "@/app/sessions/[id]/session-detail-model";
import {
  SessionAddExercisePanel,
  SessionAddExerciseSheet,
} from "@/app/sessions/[id]/session-add-exercise";
import { SessionCompactBar } from "@/app/sessions/[id]/session-compact-bar";
import { SessionDetailsPanel } from "@/app/sessions/[id]/session-details-panel";
import { SessionExerciseBlock } from "@/app/sessions/[id]/session-exercise-block";
import { SessionHeader } from "@/app/sessions/[id]/session-header";
import { upcomingSessionLogMessage } from "@/app/sessions/[id]/session-input";
import { SessionTargetsSheet } from "@/app/sessions/[id]/session-targets-sheet";
import type { SessionSetDraft as SetDraft } from "@/app/sessions/[id]/session-set-draft";
import { useActiveExerciseReset } from "@/app/sessions/[id]/use-active-exercise-reset";
import { useActiveExerciseUrl } from "@/app/sessions/[id]/use-active-exercise-url";
import { useCompactLogFlow } from "@/app/sessions/[id]/use-compact-log-flow";
import { useExerciseSuggestionSettings } from "@/app/sessions/[id]/use-exercise-suggestion-settings";
import { useFullViewAddSetRows } from "@/app/sessions/[id]/use-full-view-add-set-rows";
import { useSessionDetailLoad } from "@/app/sessions/[id]/use-session-detail-load";
import { useToggleExerciseNotDone } from "@/app/sessions/[id]/use-toggle-exercise-not-done";

function openedSessionFor(sessionId: string | undefined): OpenedSessionSnapshot | null {
  const userId = rememberedUserId();
  if (!sessionId || !userId) {
    return null;
  }
  return peekOpenedSession(userId, sessionId);
}

export default function SessionDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;
  const [openedSession] = useState(() => openedSessionFor(sessionId));
  const [trackedSessionId, setTrackedSessionId] = useState(sessionId);

  const [isChecking, setIsChecking] = useState(openedSession == null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [session, setSession] = useState<SessionRow | null>(openedSession?.session ?? null);
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseRow[]>(
    openedSession?.sessionExercises ?? [],
  );
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetRow[]>(openedSession?.workoutSets ?? []);
  const [sessionNumber, setSessionNumber] = useState<number | null>(openedSession?.sessionNumber ?? null);
  const [createdFromLabel, setCreatedFromLabel] = useState<string | null>(openedSession?.createdFromLabel ?? null);
  const [exerciseLabels, setExerciseLabels] = useState<Map<string, string>>(
    () => new Map(openedSession?.exerciseLabels ?? []),
  );
  const [addDrafts, setAddDrafts] = useState<Record<string, Partial<SetDraft>>>({});
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SetDraft>(emptySetDraft);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isDeleteSessionConfirmOpen, setIsDeleteSessionConfirmOpen] = useState(false);
  const [exerciseOptions, setExerciseOptions] = useState<Array<{ id: string; label: string; slug: string }>>(
    openedSession?.exerciseOptions ?? [],
  );
  const [addExerciseDraft, setAddExerciseDraft] =
    useState<AddExerciseDraft>(emptyAddExerciseDraft);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isAddExerciseExpanded, setIsAddExerciseExpanded] = useState(false);
  const [isAddExerciseSheetOpen, setIsAddExerciseSheetOpen] = useState(false);
  const [isTargetsSheetOpen, setIsTargetsSheetOpen] = useState(false);
  const [targetsSets, setTargetsSets] = useState("");
  const [targetsReps, setTargetsReps] = useState("");
  const [targetsWeightKg, setTargetsWeightKg] = useState("");
  const [targetsSessionExerciseId, setTargetsSessionExerciseId] = useState<string | null>(null);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(
    () => new Set(openedSession?.hiddenExerciseIds ?? []),
  );
  const [pendingCompactSetFocusSessionExerciseId, setPendingCompactSetFocusSessionExerciseId] =
    useState<string | null>(null);
  const [performedOnDraft, setPerformedOnDraft] = useState(openedSession?.session.performed_on ?? "");
  const [notesDraft, setNotesDraft] = useState(openedSession?.session.notes ?? "");
  const [sessionDetailsDateError, setSessionDetailsDateError] = useState<string | null>(null);
  const [sessionDetailsNotesError, setSessionDetailsNotesError] = useState<string | null>(null);
  const [isSavingSessionDetails, setIsSavingSessionDetails] = useState(false);
  const [isEditingSessionDetails, setIsEditingSessionDetails] = useState(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const skipSessionRefreshRef = useRef(false);
  skipSessionRefreshRef.current =
    editingSetId != null ||
    isEditingSessionDetails ||
    isSavingSet ||
    isAddingExercise ||
    isSavingTargets ||
    isSavingSessionDetails ||
    isMarkingCompleted;

  function applyOpenedSession(snapshot: OpenedSessionSnapshot, keepDrafts = false) {
    setSession(snapshot.session);
    setSessionExercises(snapshot.sessionExercises);
    setWorkoutSets(snapshot.workoutSets);
    setSessionNumber(snapshot.sessionNumber);
    setCreatedFromLabel(snapshot.createdFromLabel);
    setExerciseLabels(new Map(snapshot.exerciseLabels));
    setExerciseOptions(snapshot.exerciseOptions);
    setHiddenExerciseIds(new Set(snapshot.hiddenExerciseIds));
    if (!keepDrafts) {
      setPerformedOnDraft(snapshot.session.performed_on);
      setNotesDraft(snapshot.session.notes ?? "");
      setSessionDetailsDateError(null);
      setSessionDetailsNotesError(null);
    }
    setIsChecking(false);
  }

  if (sessionId !== trackedSessionId) {
    setTrackedSessionId(sessionId);
    const nextOpened = openedSessionFor(sessionId);
    if (nextOpened) {
      applyOpenedSession(nextOpened);
    } else {
      setIsChecking(true);
      setSession(null);
    }
  }

  const isReadOnly = sessionIsReadOnly(session?.completed_at ?? null);
  const { isSmallPhone, compactShowExtraSetComposer, setCompactShowExtraSetComposer } =
    useCompactLogFlow({ sessionExercises, workoutSets, activeExerciseIndex, isReadOnly });
  const {
    warmupSuggestionsDisabledExerciseIds,
    targetSuggestionsDisabledExerciseIds,
    maxWarmupSetsByExerciseId,
  } = useExerciseSuggestionSettings(session?.user_id, exerciseOptions);

  const addExercisePickerOptions = useMemo(
    () =>
      exerciseOptionsForPicker(
        exerciseOptions,
        hiddenExerciseIds,
        addExerciseDraft.exerciseId,
      ),
    [exerciseOptions, hiddenExerciseIds, addExerciseDraft.exerciseId],
  );

  const exerciseSlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of exerciseOptions) {
      map.set(option.id, option.slug);
    }
    return map;
  }, [exerciseOptions]);

  const exerciseBadgeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of exerciseOptions) {
      map.set(option.id, toExerciseBadge(option.slug));
    }
    return map;
  }, [exerciseOptions]);

  function showError(messageText: string) {
    setMessageTone("error");
    setMessage(messageText);
  }

  function showWarning(messageText: string) {
    setMessageTone("warning");
    setMessage(messageText);
  }

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  useSessionDetailLoad({
    sessionId,
    router,
    skipSessionRefreshRef,
    applyOpenedSession,
    setIsChecking,
    showError,
  });

  useEffect(() => {
    if (isReadOnly) {
      setEditingSetId(null);
      setEditDraft(emptySetDraft);
      setIsEditingSessionDetails(false);
    }
  }, [isReadOnly]);

  const { fullViewExpandAddSetRowIds, expandFullAddSetRow } = useFullViewAddSetRows({
    sessionId,
    sessionExercises,
    workoutSets,
  });
  useActiveExerciseReset({
    sessionId,
    isChecking,
    sessionExercises,
    activeExerciseIndex,
    setActiveExerciseIndex,
    clearMessage,
  });
  useActiveExerciseUrl({
    router,
    pathname,
    searchParams,
    sessionId,
    loadedSessionId: session?.id,
    isChecking,
    sessionExercises,
    activeExerciseIndex,
    setActiveExerciseIndex,
  });
  const { savingNotDoneId, toggleExerciseNotDone } = useToggleExerciseNotDone({
    setSessionExercises,
    showError,
  });

  function updateAddDraft(
    sessionExerciseId: string,
    key: keyof SetDraft,
    value: string | boolean,
  ) {
    setAddDrafts((prev) => ({
      ...prev,
      [sessionExerciseId]: {
        ...prev[sessionExerciseId],
        [key]: value,
      },
    }));
  }

  const {
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
    moveSessionToToday,
    markSessionCompleted,
    undoSessionCompleted,
  } = createSessionDetailActions({
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
    isCompactView: isSmallPhone,
    exerciseLabels,
    exerciseSlugById,
    showError,
    showWarning,
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
  });

  if (isChecking) {
    return (
      <PageShell>
        <h1 className="text-2xl font-semibold tracking-tight">Workout session</h1>
        <ContentPlaceholder
          label="Loading workout session..."
          rows={SESSION_LOG_PLACEHOLDER_ROWS}
          rowClassName={SESSION_LOG_PLACEHOLDER_CLASS}
        />
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="panel p-5">
          <p className="text-sm text-red-600">{message ?? "Session not found."}</p>
        </section>
      </PageShell>
    );
  }

  const formattedPerformedOn = formatDateOnlyForLocale(session.performed_on);
  const isPlannedSession = isFutureSessionDate(session.performed_on);
  const lifecycleFields = {
    performedOn: session.performed_on,
    startedAt: session.started_at,
    completedAt: session.completed_at,
  };
  const lifecycleStatus = sessionLifecycleStatus(lifecycleFields);
  const showUndoCompleted = canUndoSessionCompleted(lifecycleFields);
  const showMarkCompleted = !isReadOnly && canMarkSessionCompleted(lifecycleFields);
  const canManageSets = !isReadOnly && !isPlannedSession;

  const isCompactView = isSmallPhone;
  const shouldUseSingleExerciseFlow = isCompactView && !isReadOnly;
  const visibleExercises = visibleExerciseEntries(
    sessionExercises,
    activeExerciseIndex,
    shouldUseSingleExerciseFlow,
  );
  const activeSessionExercise =
    sessionExercises.length > 0 ? (sessionExercises[activeExerciseIndex] ?? sessionExercises[0]) : null;
  const activeExerciseLabel =
    activeSessionExercise
      ? (exerciseLabels.get(activeSessionExercise.exercise_id) ?? activeSessionExercise.exercise_id)
      : "";
  const targetsExercise = resolveTargetsExercise({
    sessionExercises,
    exerciseLabels,
    exerciseSlugById,
    targetsSessionExerciseId,
    activeExerciseLabel,
  });
  const nextLabel = stickyNextLabel({
    singleExerciseFlow: shouldUseSingleExerciseFlow,
    canManageSets,
    targetSetsMet: isTargetSetsGoalMet(activeSessionExercise, workoutSets),
    showExtraSetComposer: compactShowExtraSetComposer,
    activeExerciseIndex,
    exerciseCount: sessionExercises.length,
  });
  const addExerciseFormProps = {
    draft: addExerciseDraft,
    setDraft: setAddExerciseDraft,
    pickerOptions: addExercisePickerOptions,
    exerciseSlugById,
    sessionId,
    targetSuggestionsDisabledExerciseIds,
    isAdding: isAddingExercise,
    onSubmit: addExerciseToSession,
  };

  return (
    <PageShell
      className={
        isCompactView
          ? // Sticky bar height plus the same 0.75rem gap used between set rows.
            "max-md:!pb-[calc(7.5rem+1px+max(0.75rem,env(safe-area-inset-bottom,0px)))]"
          : undefined
      }
    >
      <DocumentTitle
        page={sessionNumber != null ? workoutSessionPageTitle(sessionNumber) : null}
      />
      <SessionHeader
        isCompactView={isCompactView}
        isReadOnly={isReadOnly}
        sessionNumber={sessionNumber}
        formattedPerformedOn={formattedPerformedOn}
        lifecycleStatus={lifecycleStatus}
        createdFromLabel={createdFromLabel}
        isDeletingSession={isDeletingSession}
        isSavingSet={isSavingSet}
        isMarkingCompleted={isMarkingCompleted}
        isDeleteSessionConfirmOpen={isDeleteSessionConfirmOpen}
        showUndoCompleted={showUndoCompleted}
        showMarkCompleted={showMarkCompleted}
        onRequestDelete={() => setIsDeleteSessionConfirmOpen(true)}
        onCancelDelete={() => setIsDeleteSessionConfirmOpen(false)}
        onConfirmDelete={deleteSession}
        onUndoCompleted={undoSessionCompleted}
        onMarkCompleted={markSessionCompleted}
        onAddExercise={() => setIsAddExerciseSheetOpen(true)}
      />
      <section className="text-sm">
        <SessionDetailsPanel
          isReadOnly={isReadOnly}
          isCompactView={isCompactView}
          isEditing={isEditingSessionDetails}
          notes={session.notes}
          formattedPerformedOn={formattedPerformedOn}
          performedOnDraft={performedOnDraft}
          notesDraft={notesDraft}
          dateError={sessionDetailsDateError}
          notesError={sessionDetailsNotesError}
          isDirty={isSessionDetailsDirty(session, performedOnDraft, notesDraft)}
          isSaving={isSavingSessionDetails}
          isDeletingSession={isDeletingSession}
          onBeginEdit={beginEditingSessionDetails}
          onPerformedOnChange={(value) => {
            setPerformedOnDraft(value);
            setSessionDetailsDateError(null);
          }}
          onNotesChange={(next) => {
            setNotesDraft(next);
            setSessionDetailsNotesError(null);
          }}
          onSave={saveSessionDetails}
          onCancel={cancelEditingSessionDetails}
        />
        {isPlannedSession ? (
          <div className={panelInsetClass("mt-3 flex flex-wrap items-center justify-between gap-3 p-3")}>
            <p className="min-w-0 text-sm text-zinc-800">
              {upcomingSessionLogMessage(formattedPerformedOn)}
            </p>
            <ActionButton
              type="button"
              variant="primary"
              size="sm"
              className="shrink-0"
              disabled={isSavingSessionDetails || isDeletingSession}
              onClick={() => void moveSessionToToday()}
            >
              {isSavingSessionDetails ? "Saving..." : "Move to today"}
            </ActionButton>
          </div>
        ) : null}
        {message ? (
          <StatusNotice message={message} tone={messageTone} onDismiss={clearMessage} className="mt-3" />
        ) : null}

        {sessionExercises.length === 0 ? (
          <section className={panelInsetClass("mt-4 p-4 text-sm text-zinc-600")}>
            No exercises were added to this session.
          </section>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleExercises.map(({ item: sessionExercise, index }) => (
              <SessionExerciseBlock
                key={sessionExercise.id}
                sessionExercise={sessionExercise}
                index={index}
                exerciseCount={sessionExercises.length}
                workoutSets={workoutSets}
                addDrafts={addDrafts}
                exerciseLabel={
                  exerciseLabels.get(sessionExercise.exercise_id) ?? sessionExercise.exercise_id
                }
                exerciseBadge={exerciseBadgeById.get(sessionExercise.exercise_id)}
                exerciseSlug={exerciseSlugById.get(sessionExercise.exercise_id)}
                sessionId={sessionId ?? null}
                sessionPerformedOn={session.performed_on}
                isReadOnly={isReadOnly}
                shouldUseSingleExerciseFlow={shouldUseSingleExerciseFlow}
                isCompactView={isCompactView}
                canManageSets={canManageSets}
                isPlannedSession={isPlannedSession}
                isSavingSet={isSavingSet}
                compactShowExtraSetComposer={compactShowExtraSetComposer}
                fullAddSetRowExpanded={fullViewExpandAddSetRowIds.has(sessionExercise.id)}
                targetsOpenInline={
                  targetsSessionExerciseId === sessionExercise.id && !isTargetsSheetOpen
                }
                targetsSets={targetsSets}
                targetsReps={targetsReps}
                targetsWeightKg={targetsWeightKg}
                isSavingTargets={isSavingTargets}
                editingSetId={editingSetId}
                editDraft={editDraft}
                onEditDraftChange={setEditDraft}
                onUpdateAddDraft={updateAddDraft}
                onToggleTargets={() => {
                  const isOpenForThisExercise =
                    targetsSessionExerciseId === sessionExercise.id && !isTargetsSheetOpen;
                  if (isOpenForThisExercise) {
                    cancelTargetsEdit();
                    return;
                  }
                  startTargetsEdit(sessionExercise, "inline");
                }}
                onCancelTargets={cancelTargetsEdit}
                onSaveTargets={() => {
                  void saveTargetsForExercise();
                }}
                onTargetsSetsChange={setTargetsSets}
                onTargetsRepsChange={setTargetsReps}
                onTargetsWeightChange={setTargetsWeightKg}
                isSavingNotDone={savingNotDoneId === sessionExercise.id}
                onToggleNotDone={() => {
                  void toggleExerciseNotDone(sessionExercise);
                }}
                onAddWarmups={(sessionExerciseId) => {
                  void handleAddWarmups(sessionExerciseId);
                }}
                suggestTarget={
                  !targetSuggestionsDisabledExerciseIds.has(sessionExercise.exercise_id)
                }
                suggestWarmups={!warmupSuggestionsDisabledExerciseIds.has(sessionExercise.exercise_id)}
                maxWarmupSets={maxWarmupSetsByExerciseId.get(sessionExercise.exercise_id) ?? null}
                onAddSet={(sessionExerciseId) => {
                  void handleAddSet(sessionExerciseId);
                }}
                onStartEdit={startEdit}
                onSaveEdit={(setId) => {
                  void saveEdit(setId);
                }}
                onCancelEdit={cancelEdit}
                onDeleteSet={(setId) => {
                  void deleteSet(setId);
                }}
                onMarkCompleted={showMarkCompleted ? () => void markSessionCompleted() : undefined}
                isMarkingCompleted={isMarkingCompleted}
                onNextExercise={() =>
                  setActiveExerciseIndex((prev) => Math.min(sessionExercises.length - 1, prev + 1))
                }
                onAddExercise={() => setIsAddExerciseSheetOpen(true)}
                onShowExtraSets={() => setCompactShowExtraSetComposer(true)}
                onExpandFullAddSetRow={() => expandFullAddSetRow(sessionExercise.id)}
              />
            ))}
          </div>
        )}

        {!isReadOnly && !isCompactView ? (
          <SessionAddExercisePanel
            {...addExerciseFormProps}
            isExpanded={isAddExerciseExpanded}
            onToggleExpanded={() => setIsAddExerciseExpanded((prev) => !prev)}
          />
        ) : null}
      </section>

      {isCompactView && !isReadOnly && activeSessionExercise ? (
        <SessionCompactBar
          activeSessionExercise={activeSessionExercise}
          activeExerciseIndex={activeExerciseIndex}
          exerciseCount={sessionExercises.length}
          nextLabel={nextLabel}
          isSavingNotDone={savingNotDoneId === activeSessionExercise.id}
          setActiveExerciseIndex={setActiveExerciseIndex}
          onToggleNotDone={() => {
            void toggleExerciseNotDone(activeSessionExercise);
          }}
          onSetTargets={() => startTargetsEdit(activeSessionExercise, "sheet")}
        />
      ) : null}
      {!isReadOnly && isTargetsSheetOpen ? (
        <SessionTargetsSheet
          exerciseLabel={targetsExercise.label}
          exerciseId={targetsExercise.exerciseId}
          exerciseSlug={targetsExercise.slug}
          sessionId={sessionId}
          targetsSets={targetsSets}
          targetsReps={targetsReps}
          targetsWeightKg={targetsWeightKg}
          targetSuggestionsDisabledExerciseIds={targetSuggestionsDisabledExerciseIds}
          isSavingTargets={isSavingTargets}
          onTargetsSetsChange={setTargetsSets}
          onTargetsRepsChange={setTargetsReps}
          onTargetsWeightChange={setTargetsWeightKg}
          onCancel={cancelTargetsEdit}
          onSave={saveTargetsForExercise}
        />
      ) : null}
      {isCompactView && !isReadOnly && isAddExerciseSheetOpen ? (
        <SessionAddExerciseSheet
          {...addExerciseFormProps}
          onClose={() => setIsAddExerciseSheetOpen(false)}
        />
      ) : null}
    </PageShell>
  );
}
