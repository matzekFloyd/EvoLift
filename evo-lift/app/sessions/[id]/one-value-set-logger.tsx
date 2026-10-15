"use client";

import { useEffect, useRef } from "react";
import { SetKindIndicator } from "@/app/components/set-kind-indicator";
import {
  TARGET_SETS_LOGGED,
  lastSetSummary,
  oneValueContextLine,
  oneValuePrimaryAction,
  oneValuePrimaryLabel,
  type OneValuePresence,
} from "./one-value-logging";

type OneValueSetLoggerProps = {
  exerciseId: string;
  exerciseName: string;
  presence: OneValuePresence;
  workingSetNumber: number;
  targetWorkingSets: number | null;
  lastSet: { weight_kg: number | null; reps: number; is_warmup: boolean } | null;
  fieldError: string | null;
  isSaving: boolean;
  showPrimaryInPanel: boolean;
  hasNextExercise: boolean;
  showExerciseNav: boolean;
  isPreviousDisabled: boolean;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onWarmupChange: (value: boolean) => void;
  onStepWeight: (delta: number) => void;
  onStepReps: (delta: number) => void;
  onPrimary: () => void;
  onBack: () => void;
  onNextExercise: () => void;
  onPreviousExercise: () => void;
};

const primaryButtonClass =
  "inline-flex h-14 w-full items-center justify-center rounded-md border border-sky-700 bg-sky-700 px-3 text-base font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60";

const stepperClass =
  "inline-flex h-12 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-white text-base font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-50";

export function OneValueSetLogger({
  exerciseId,
  exerciseName,
  presence,
  workingSetNumber,
  targetWorkingSets,
  lastSet,
  fieldError,
  isSaving,
  showPrimaryInPanel,
  hasNextExercise,
  showExerciseNav,
  isPreviousDisabled,
  onWeightChange,
  onRepsChange,
  onWarmupChange,
  onStepWeight,
  onStepReps,
  onPrimary,
  onBack,
  onNextExercise,
  onPreviousExercise,
}: OneValueSetLoggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const screen = presence.status === "entry" ? presence.step.screen : null;
  const action = oneValuePrimaryAction(presence);
  const primaryLabel = isSaving && action === "save" ? "Saving..." : oneValuePrimaryLabel(action);
  const lastLine = lastSetSummary(lastSet);

  useEffect(() => {
    if (!screen) {
      return;
    }
    inputRef.current?.focus();
  }, [screen, exerciseId]);

  return (
    <div className="mt-3 rounded-md border border-sky-200 bg-sky-50/70 p-4">
      {presence.status === "entry" ? (
        <>
          <label htmlFor={`one-value-${exerciseId}`} className="block text-sm font-medium text-zinc-800">
            {oneValueContextLine({
              exerciseName,
              screen: presence.step.screen,
              workingSetNumber,
              targetWorkingSets,
              isWarmup: presence.step.isWarmup,
            })}
          </label>
          {lastLine ? (
            <p className="mt-2 text-sm text-zinc-600">
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {lastSet?.is_warmup ? <SetKindIndicator isWarmup density="compact" /> : null}
                <span>{lastLine}</span>
              </span>
            </p>
          ) : null}
          <input
            ref={inputRef}
            id={`one-value-${exerciseId}`}
            type="number"
            inputMode={presence.step.screen === "load" ? "decimal" : "numeric"}
            min={presence.step.screen === "load" ? 0 : 1}
            step={presence.step.screen === "load" ? "0.25" : "1"}
            value={presence.step.screen === "load" ? presence.step.weightKg : presence.step.reps}
            onChange={(event) =>
              presence.step.screen === "load"
                ? onWeightChange(event.target.value)
                : onRepsChange(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onPrimary();
              }
            }}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `one-value-error-${exerciseId}` : undefined}
            className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-center text-2xl tabular-nums"
          />
          {fieldError ? (
            <p id={`one-value-error-${exerciseId}`} className="mt-2 text-sm text-red-600" role="alert">
              {fieldError}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            {presence.step.screen === "load" ? (
              <>
                <button type="button" className={stepperClass} onClick={() => onStepWeight(-2.5)}>
                  −2.5
                </button>
                <button type="button" className={stepperClass} onClick={() => onStepWeight(2.5)}>
                  +2.5
                </button>
              </>
            ) : (
              <>
                <button type="button" className={stepperClass} onClick={() => onStepReps(-1)}>
                  −1
                </button>
                <button type="button" className={stepperClass} onClick={() => onStepReps(1)}>
                  +1
                </button>
              </>
            )}
          </div>
          {presence.step.screen === "load" ? (
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={presence.step.isWarmup}
                onChange={(event) => onWarmupChange(event.target.checked)}
              />
              Warmup?
            </label>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Back
            </button>
          </div>
        </>
      ) : (
        <>
          {presence.status === "paused" && presence.reason === "target-met" ? (
            <p className="text-sm font-medium text-sky-950">{TARGET_SETS_LOGGED}</p>
          ) : null}
          {presence.status === "paused" && presence.reason === "open" ? (
            <p className="text-sm font-medium text-zinc-800">{exerciseName}</p>
          ) : null}
          {presence.status === "left" ? <p className="text-sm text-zinc-700">Set not saved.</p> : null}
        </>
      )}
      {showPrimaryInPanel ? (
        <button
          type="button"
          onClick={onPrimary}
          disabled={isSaving}
          className={`${primaryButtonClass} mt-4`}
        >
          {primaryLabel}
        </button>
      ) : null}
      {showExerciseNav ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPreviousExercise}
            disabled={isPreviousDisabled}
            className="inline-flex h-10 min-w-24 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNextExercise}
            disabled={!hasNextExercise}
            className="inline-flex h-10 min-w-24 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
          >
            Next exercise
          </button>
        </div>
      ) : null}
    </div>
  );
}
