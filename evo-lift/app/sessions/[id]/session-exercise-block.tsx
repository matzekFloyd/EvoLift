"use client";

import { Check, ChevronDown, ChevronUp, CircleOff, History, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import Link from "next/link";
import { panelInsetClass } from "@/app/components/panel-inset";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import { WarmupSuggestion } from "@/app/components/warmup-suggestion";
import { targetWeightFieldLabel } from "@/lib/assistance-exercise";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";
import { PLANNED_SESSION_SETS_MESSAGE } from "./session-input";
import { lastLoggedSet, resolvedAddDraft, setsForSessionExercise } from "./session-detail-model";
import {
  showSessionExerciseTargetsMet,
  SKIPPED_EXERCISE_BUTTON_TITLE,
  skippedExerciseButtonClass,
  skippedExerciseChipClass,
  skippedExerciseLabel,
} from "./session-exercise-status";
import { SessionExerciseHistoryDialog } from "./session-exercise-history-dialog";
import { SetTargetsFields } from "./set-targets-fields";
import { SessionExerciseSets } from "./session-set-form";
import type { SessionSetDraft } from "./session-set-draft";
import type { SessionExerciseRow, WorkoutSetRow } from "./session-detail-actions";

type SessionExerciseBlockProps = {
  sessionExercise: SessionExerciseRow;
  index: number;
  exerciseCount: number;
  workoutSets: WorkoutSetRow[];
  addDrafts: Record<string, Partial<SessionSetDraft>>;
  exerciseLabel: string;
  exerciseBadge: string | undefined;
  exerciseSlug: string | undefined;
  sessionId: string | null;
  isReadOnly: boolean;
  shouldUseSingleExerciseFlow: boolean;
  isCompactView: boolean;
  canManageSets: boolean;
  isPlannedSession: boolean;
  isSavingSet: boolean;
  compactShowExtraSetComposer: boolean;
  fullAddSetRowExpanded: boolean;
  targetsOpenInline: boolean;
  targetsSets: string;
  targetsReps: string;
  targetsWeightKg: string;
  isSavingTargets: boolean;
  editingSetId: string | null;
  editDraft: SessionSetDraft;
  onEditDraftChange: Dispatch<SetStateAction<SessionSetDraft>>;
  onUpdateAddDraft: (sessionExerciseId: string, key: keyof SessionSetDraft, value: string | boolean) => void;
  onToggleTargets: () => void;
  onCancelTargets: () => void;
  onSaveTargets: () => void;
  onTargetsSetsChange: (value: string) => void;
  onTargetsRepsChange: (value: string) => void;
  onTargetsWeightChange: (value: string) => void;
  isSavingNotDone: boolean;
  onToggleNotDone: () => void;
  onAddWarmups: (sessionExerciseId: string) => void;
  /** Account preference for this exercise. Missing stays on. */
  suggestTarget?: boolean;
  /** Account preference for this exercise. Missing stays on. */
  suggestWarmups?: boolean;
  /** Account cap. Null keeps the full ladder. */
  maxWarmupSets?: number | null;
  onAddSet: (sessionExerciseId: string) => void;
  onStartEdit: (set: WorkoutSetRow) => void;
  onSaveEdit: (setId: string) => void;
  onCancelEdit: () => void;
  onDeleteSet: (setId: string) => void;
  onMarkCompleted?: () => void;
  isMarkingCompleted?: boolean;
  onNextExercise: () => void;
  onAddExercise: () => void;
  onShowExtraSets: () => void;
  onExpandFullAddSetRow: () => void;
};

export function SessionExerciseBlock({
  sessionExercise,
  index,
  exerciseCount,
  workoutSets,
  addDrafts,
  exerciseLabel,
  exerciseBadge,
  exerciseSlug,
  sessionId,
  isReadOnly,
  shouldUseSingleExerciseFlow,
  isCompactView,
  canManageSets,
  isPlannedSession,
  isSavingSet,
  compactShowExtraSetComposer,
  fullAddSetRowExpanded,
  targetsOpenInline,
  targetsSets,
  targetsReps,
  targetsWeightKg,
  isSavingTargets,
  editingSetId,
  editDraft,
  onEditDraftChange,
  onUpdateAddDraft,
  onToggleTargets,
  onCancelTargets,
  onSaveTargets,
  onTargetsSetsChange,
  onTargetsRepsChange,
  onTargetsWeightChange,
  isSavingNotDone,
  onToggleNotDone,
  onAddWarmups,
  suggestTarget = true,
  suggestWarmups = true,
  maxWarmupSets = null,
  onAddSet,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteSet,
  onMarkCompleted,
  isMarkingCompleted = false,
  onNextExercise,
  onAddExercise,
  onShowExtraSets,
  onExpandFullAddSetRow,
}: SessionExerciseBlockProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const sets = setsForSessionExercise(workoutSets, sessionExercise.id);
  const addDraft = resolvedAddDraft([sessionExercise], workoutSets, addDrafts, sessionExercise.id);
  const lastSet = lastLoggedSet(workoutSets, sessionExercise.id);
  const targetParts = [
    sessionExercise.target_sets ? `${sessionExercise.target_sets} working sets` : null,
    sessionExercise.target_weight_kg != null ? `${sessionExercise.target_weight_kg} kg` : null,
    sessionExercise.target_reps ? `${sessionExercise.target_reps} reps` : null,
  ].filter(Boolean) as string[];
  const workingSetCount = sets.filter((set) => !set.is_warmup).length;
  const loggedTargetSets =
    sessionExercise.target_sets != null &&
    sessionExercise.target_sets > 0 &&
    workingSetCount >= sessionExercise.target_sets;
  const targetSetsMet = showSessionExerciseTargetsMet({
    workingSetCount,
    targetSets: sessionExercise.target_sets,
    notDone: sessionExercise.not_done,
  });
  const exercisePanelClass = shouldUseSingleExerciseFlow
    ? "px-1 pt-1 text-sm"
    : isReadOnly
      ? `rounded-md border bg-white p-4 text-sm sm:p-5 ${
          targetSetsMet ? "border-sky-300" : "border-zinc-200"
        }`
      : targetSetsMet
        ? "rounded-md border border-sky-200/90 bg-sky-50/40 p-5 text-sm"
        : panelInsetClass("p-5 text-sm");

  return (
    <section id={`exercise-${sessionExercise.id}`} className={exercisePanelClass}>
      <div className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          {exerciseSlug ? (
            <Link
              href={`/exercises/${exerciseSlug}`}
              className="group inline-flex min-w-0 items-center gap-2 truncate rounded-sm text-lg font-medium text-zinc-900 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
            >
              {exerciseBadge ? (
                <span className="inline-flex h-6 min-w-8 shrink-0 items-center justify-center rounded border border-zinc-300 bg-zinc-50 px-1 text-[10px] font-semibold tracking-wide text-zinc-700 transition-colors group-hover:border-sky-300 group-hover:text-sky-800">
                  {exerciseBadge}
                </span>
              ) : null}
              <span className="truncate underline-offset-2 hover:underline">{exerciseLabel}</span>
            </Link>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-2 truncate text-lg font-medium text-zinc-900">
              {exerciseBadge ? (
                <span className="inline-flex h-6 min-w-8 shrink-0 items-center justify-center rounded border border-zinc-300 bg-zinc-50 px-1 text-[10px] font-semibold tracking-wide text-zinc-700">
                  {exerciseBadge}
                </span>
              ) : null}
              <span className="truncate">{exerciseLabel}</span>
            </span>
          )}
          {sessionExercise.not_done ? (
            <span className={`${skippedExerciseChipClass} shrink-0`}>{skippedExerciseLabel(true)}</span>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {index + 1}/{exerciseCount}
        </span>
      </div>
      {sessionExercise.not_done && !isReadOnly && !shouldUseSingleExerciseFlow ? (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            aria-pressed
            disabled={isSavingNotDone}
            onClick={onToggleNotDone}
            title={SKIPPED_EXERCISE_BUTTON_TITLE}
            className={`inline-flex h-9 items-center justify-center gap-1 rounded-md border px-2 text-xs disabled:opacity-60 ${skippedExerciseButtonClass(true)}`}
          >
            <CircleOff className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            {skippedExerciseLabel(true)}
          </button>
        </div>
      ) : null}
      <div className="relative">
        <div inert={sessionExercise.not_done ? true : undefined}>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="inline-flex h-9 items-center text-sm font-medium text-zinc-600">Targets:</span>
          {targetParts.length > 0 ? (
            targetParts.map((part) => (
              <span key={`${sessionExercise.id}-${part}`} className="inline-flex h-9 items-center">
                <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  {part}
                </span>
              </span>
            ))
          ) : (
            <span className="inline-flex h-9 items-center text-xs text-zinc-500">none set</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          {exerciseSlug && !isReadOnly ? (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              <History className="h-3.5 w-3.5 text-sky-700" />
              Open history
            </button>
          ) : null}
          {!isReadOnly && !shouldUseSingleExerciseFlow && !sessionExercise.not_done ? (
            <button
              type="button"
              aria-pressed={sessionExercise.not_done}
              disabled={isSavingNotDone}
              onClick={onToggleNotDone}
              title={SKIPPED_EXERCISE_BUTTON_TITLE}
              className={`inline-flex h-9 items-center justify-center gap-1 rounded-md border px-2 text-xs disabled:opacity-60 ${skippedExerciseButtonClass(sessionExercise.not_done)}`}
            >
              <CircleOff className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              {skippedExerciseLabel(sessionExercise.not_done)}
            </button>
          ) : null}
          {!isReadOnly && !shouldUseSingleExerciseFlow ? (
            <button
              type="button"
              onClick={onToggleTargets}
              title="Edit planned working-set targets (warmups do not count)."
              className="inline-flex h-9 w-24 items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              {targetsOpenInline ? (
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
              )}
              Set targets
            </button>
          ) : null}
        </div>
      </div>
      {!shouldUseSingleExerciseFlow && targetsOpenInline ? (
        <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
          <p className="mb-3 text-xs text-zinc-600">
            Values apply to working sets only; warmups do not count.
          </p>
          <SetTargetsFields
            sets={targetsSets}
            weightKg={targetsWeightKg}
            reps={targetsReps}
            weightLabel={targetWeightFieldLabel(exerciseSlug)}
            onSetsChange={onTargetsSetsChange}
            onWeightChange={onTargetsWeightChange}
            onRepsChange={onTargetsRepsChange}
          />
          <TargetWeightSuggestion
            exerciseId={sessionExercise.exercise_id}
            plannedReps={targetsReps}
            currentWeightKg={targetsWeightKg}
            excludeSessionId={sessionId}
            enabled={targetSuggestionsEnabled(suggestTarget)}
            onApply={onTargetsWeightChange}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelTargets}
              className="inline-flex h-9 w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
            >
              <X className="h-3 w-3 text-zinc-500" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveTargets}
              disabled={isSavingTargets}
              className="inline-flex h-9 w-24 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-2 text-xs text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
            >
              <Check className="h-3 w-3 text-white" />
              {isSavingTargets ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      {!isReadOnly ? (
        <WarmupSuggestion
          targetWeightKg={sessionExercise.target_weight_kg}
          baseWeightKg={sessionExercise.base_weight_kg}
          hasSets={sets.length > 0}
          enabled={warmupSuggestionsEnabled(suggestWarmups)}
          maxSteps={maxWarmupSets}
          addDisabled={isPlannedSession || isSavingSet}
          addDisabledTitle={isPlannedSession ? PLANNED_SESSION_SETS_MESSAGE : undefined}
          onAdd={() => onAddWarmups(sessionExercise.id)}
        />
      ) : null}

      {historyOpen && exerciseSlug ? (
        <SessionExerciseHistoryDialog
          exerciseId={sessionExercise.exercise_id}
          exerciseLabel={exerciseLabel}
          exerciseSlug={exerciseSlug}
          currentSessionId={sessionId}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      <SessionExerciseSets
        sessionExerciseId={sessionExercise.id}
        exerciseSlug={exerciseSlug}
        baseWeightKg={sessionExercise.base_weight_kg}
        sets={sets}
        addDraft={addDraft}
        lastSet={lastSet}
        exerciseIndex={index}
        exerciseCount={exerciseCount}
        isCompactView={isCompactView}
        canManageSets={canManageSets}
        isPlannedSession={isPlannedSession}
        isSavingSet={isSavingSet}
        shouldUseSingleExerciseFlow={shouldUseSingleExerciseFlow}
        targetSetsMet={loggedTargetSets}
        notDone={sessionExercise.not_done}
        compactShowExtraSetComposer={compactShowExtraSetComposer}
        fullAddSetRowExpanded={fullAddSetRowExpanded}
        editingSetId={editingSetId}
        editDraft={editDraft}
        onEditDraftChange={onEditDraftChange}
        onUpdateAddDraft={(key, value) => onUpdateAddDraft(sessionExercise.id, key, value)}
        onAddSet={() => onAddSet(sessionExercise.id)}
        onStartEdit={onStartEdit}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onDeleteSet={onDeleteSet}
        onMarkCompleted={onMarkCompleted}
        isMarkingCompleted={isMarkingCompleted}
        onNextExercise={onNextExercise}
        onAddExercise={onAddExercise}
        onShowExtraSets={onShowExtraSets}
        onExpandFullAddSetRow={onExpandFullAddSetRow}
      />
        </div>
        {sessionExercise.not_done ? (
          <div className="absolute inset-0 z-10 rounded-md bg-white/25 backdrop-blur-[2px]" aria-hidden />
        ) : null}
      </div>
    </section>
  );
}
