"use client";

import { CircleOff, ListChecks } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { CompactStickyBar } from "@/app/components/compact-sticky-bar";
import type { SessionExerciseRow } from "./session-detail-actions";
import {
  SKIPPED_EXERCISE_BUTTON_TITLE,
  skippedExerciseButtonClass,
  skippedExerciseLabel,
} from "./session-exercise-status";

type SessionCompactBarProps = {
  activeSessionExercise: SessionExerciseRow;
  activeExerciseIndex: number;
  exerciseCount: number;
  nextLabel: string;
  isSavingNotDone: boolean;
  setActiveExerciseIndex: Dispatch<SetStateAction<number>>;
  onToggleNotDone: () => void;
  onSetTargets: () => void;
};

/** Compact sticky bar: Skipped and Set targets for the active exercise, plus previous / next. */
export function SessionCompactBar({
  activeSessionExercise,
  activeExerciseIndex,
  exerciseCount,
  nextLabel,
  isSavingNotDone,
  setActiveExerciseIndex,
  onToggleNotDone,
  onSetTargets,
}: SessionCompactBarProps) {
  return (
    <CompactStickyBar
      actions={
        <>
          <button
            type="button"
            aria-pressed={activeSessionExercise.not_done}
            disabled={isSavingNotDone}
            onClick={onToggleNotDone}
            title={SKIPPED_EXERCISE_BUTTON_TITLE}
            className={`inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 text-xs font-medium shadow-[0_2px_8px_rgba(0,0,0,0.08)] disabled:opacity-60 sm:px-2.5 sm:text-sm ${skippedExerciseButtonClass(activeSessionExercise.not_done)}`}
          >
            <CircleOff className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            <span className="truncate">{skippedExerciseLabel(activeSessionExercise.not_done)}</span>
          </button>
          <button
            type="button"
            onClick={onSetTargets}
            disabled={activeSessionExercise.not_done}
            title={
              activeSessionExercise.not_done
                ? "Clear Skipped to edit targets."
                : "Edit planned working-set targets (warmups do not count)."
            }
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 text-xs font-medium text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60 sm:px-2.5 sm:text-sm"
          >
            <ListChecks className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
            <span className="truncate">Set targets</span>
          </button>
        </>
      }
      progressLabel={`${activeExerciseIndex + 1}/${exerciseCount}`}
      onPrevious={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
      onNext={() => setActiveExerciseIndex((prev) => Math.min(exerciseCount - 1, prev + 1))}
      isPreviousDisabled={activeExerciseIndex === 0}
      isNextDisabled={activeExerciseIndex === exerciseCount - 1}
      nextLabel={nextLabel}
    />
  );
}
