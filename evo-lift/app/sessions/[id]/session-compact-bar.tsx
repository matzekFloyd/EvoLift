"use client";

import { Check, ListChecks } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { ActionButton } from "@/app/components/action-button";
import { CompactStickyBar } from "@/app/components/compact-sticky-bar";
import type { SessionExerciseRow } from "./session-detail-actions";
import { compactFinishChrome } from "./session-log-primary";
import { SkipExerciseButton } from "./skip-exercise-button";

type SessionCompactBarProps = {
  activeSessionExercise: SessionExerciseRow;
  activeExerciseIndex: number;
  exerciseCount: number;
  nextLabel: string;
  nextPrimary: boolean;
  showFinish: boolean;
  finishPrimary: boolean;
  isMarkingCompleted: boolean;
  isSavingNotDone: boolean;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
  onToggleNotDone: () => void;
  onSetTargets: () => void;
  onFinish: () => void;
};

/** Compact sticky bar: Skip and Set targets, previous / next, and a quiet Finish. */
export function SessionCompactBar({
  activeSessionExercise,
  activeExerciseIndex,
  exerciseCount,
  nextLabel,
  nextPrimary,
  showFinish,
  finishPrimary,
  isMarkingCompleted,
  isSavingNotDone,
  setActiveExerciseIndex,
  onToggleNotDone,
  onSetTargets,
  onFinish,
}: SessionCompactBarProps) {
  const finishChrome = compactFinishChrome({ showFinish, finishPrimary });
  const finishLabel = isMarkingCompleted ? "Saving..." : "Finish";

  return (
    <CompactStickyBar
      actions={
        <>
          {finishChrome === "filled" ? (
            <ActionButton
              type="button"
              variant="primary"
              disabled={isMarkingCompleted}
              onClick={onFinish}
              fullWidth
              className="!h-11 basis-full"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{finishLabel}</span>
            </ActionButton>
          ) : null}
          <SkipExerciseButton
            skipped={activeSessionExercise.not_done}
            disabled={isSavingNotDone}
            onClick={onToggleNotDone}
            className="!h-11 !w-auto min-w-0 flex-1"
          />
          <ActionButton
            type="button"
            variant="secondary"
            onClick={onSetTargets}
            disabled={activeSessionExercise.not_done}
            title={
              activeSessionExercise.not_done
                ? "Clear Skipped to edit targets."
                : "Edit planned working-set targets (warmups do not count)."
            }
            className="!h-11 !w-auto min-w-0 flex-1"
          >
            <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Set targets</span>
          </ActionButton>
        </>
      }
      center={
        finishChrome === "quiet" ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={isMarkingCompleted}
            className="inline-flex h-11 items-center px-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-60"
          >
            {finishLabel}
          </button>
        ) : null
      }
      onPrevious={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
      onNext={() => setActiveExerciseIndex((prev) => Math.min(exerciseCount - 1, prev + 1))}
      isPreviousDisabled={activeExerciseIndex === 0}
      isNextDisabled={activeExerciseIndex === exerciseCount - 1}
      nextLabel={nextLabel}
      nextPrimary={nextPrimary}
    />
  );
}
