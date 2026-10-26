"use client";

import { Check, ChevronDown, ChevronUp, History } from "lucide-react";
import { type Dispatch, type SetStateAction, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/app/components/action-button";
import { panelInsetClass } from "@/app/components/panel-inset";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import { WarmupSuggestion } from "@/app/components/warmup-suggestion";
import { targetWeightFieldLabel } from "@/lib/assistance-exercise";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";
import { appPath } from "@/lib/app-paths";
import { PLANNED_SESSION_SETS_MESSAGE } from "./session-input";
import { lastLoggedSet, resolvedAddDraft, setsForSessionExercise } from "./session-detail-model";
import {
  showSessionExerciseTargetsMet,
  skippedExerciseChipClass,
  skippedExerciseLabel,
} from "./session-exercise-status";
import { SkipExerciseButton } from "./skip-exercise-button";
import type { SessionLogPrimary } from "./session-log-primary";
import { SessionExerciseHistoryDialog } from "./session-exercise-history-dialog";
import { usePreviousSessionWorkingSets } from "./use-last-session-set-comparison";
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
  /** Performed date of the session on screen. Last session older than 30 days stays hidden. */
  sessionPerformedOn: string;
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
  logPrimary: SessionLogPrimary;
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
  sessionPerformedOn,
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
  logPrimary,
  onShowExtraSets,
  onExpandFullAddSetRow,
}: SessionExerciseBlockProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const previousWorkingSets = usePreviousSessionWorkingSets(
    sessionExercise.exercise_id,
    sessionId,
    sessionPerformedOn,
  );
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
  const buttonsRaised = !shouldUseSingleExerciseFlow && !isReadOnly;

  return (
    <section id={`exercise-${sessionExercise.id}`} className={`${exercisePanelClass} scroll-mt-4`}>
      <div className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          {exerciseSlug ? (
            <Link
              href={appPath(`/exercises/${exerciseSlug}`)}
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
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          <span aria-hidden>
            {index + 1}/{exerciseCount}
          </span>
          <span className="sr-only">
            Exercise {index + 1} of {exerciseCount}
          </span>
        </span>
      </div>
      {sessionExercise.not_done && !isReadOnly && !shouldUseSingleExerciseFlow ? (
        <div className="mt-1 flex justify-end">
          <SkipExerciseButton
            skipped
            disabled={isSavingNotDone}
            onClick={onToggleNotDone}
            raised={buttonsRaised}
          />
        </div>
      ) : null}
      <div className="relative">
        <div inert={sessionExercise.not_done ? true : undefined}>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
        <div className="flex items-center gap-2 self-start">
          {exerciseSlug && !isReadOnly ? (
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              raised={buttonsRaised}
              onClick={() => setHistoryOpen(true)}
              aria-haspopup="dialog"
            >
              <History className="h-3.5 w-3.5" aria-hidden />
              Open history
            </ActionButton>
          ) : null}
          {!isReadOnly && !shouldUseSingleExerciseFlow && !sessionExercise.not_done ? (
            <SkipExerciseButton
              skipped={false}
              disabled={isSavingNotDone}
              onClick={onToggleNotDone}
              raised={buttonsRaised}
            />
          ) : null}
          {!isReadOnly && !shouldUseSingleExerciseFlow ? (
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              raised={buttonsRaised}
              onClick={onToggleTargets}
              aria-expanded={targetsOpenInline}
              title="Edit planned working-set targets (warmups do not count)."
            >
              {targetsOpenInline ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              )}
              Set targets
            </ActionButton>
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
            currentReps={targetsReps}
            currentWeightKg={targetsWeightKg}
            excludeSessionId={sessionId}
            enabled={targetSuggestionsEnabled(suggestTarget)}
            onApply={({ weightKg, reps }) => {
              onTargetsWeightChange(weightKg);
              if (reps != null) {
                onTargetsRepsChange(reps);
              }
            }}
          />
          <div className="mt-3 flex justify-end gap-2">
            <ActionButton type="button" variant="secondary" size="sm" onClick={onCancelTargets}>
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              variant={logPrimary === "save-targets" ? "primary" : "secondary"}
              size="sm"
              disabled={isSavingTargets}
              onClick={onSaveTargets}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              {isSavingTargets ? "Saving..." : "Save"}
            </ActionButton>
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
        logPrimary={logPrimary}
        onShowExtraSets={onShowExtraSets}
        onExpandFullAddSetRow={onExpandFullAddSetRow}
        previousWorkingSets={previousWorkingSets}
      />
        </div>
        {sessionExercise.not_done ? (
          <div className="absolute inset-0 z-10 rounded-md bg-white/25 backdrop-blur-[2px]" aria-hidden />
        ) : null}
      </div>
    </section>
  );
}
