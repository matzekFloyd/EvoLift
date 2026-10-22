"use client";

import { Check, X } from "lucide-react";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import { targetWeightFieldLabel } from "@/lib/assistance-exercise";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import { SessionBottomSheet } from "./session-bottom-sheet";
import { SetTargetsFields } from "./set-targets-fields";

type SessionTargetsSheetProps = {
  exerciseLabel: string;
  exerciseId: string;
  exerciseSlug: string | undefined;
  sessionId: string | undefined;
  targetsSets: string;
  targetsReps: string;
  targetsWeightKg: string;
  targetSuggestionsDisabledExerciseIds: ReadonlySet<string>;
  isSavingTargets: boolean;
  onTargetsSetsChange: (value: string) => void;
  onTargetsRepsChange: (value: string) => void;
  onTargetsWeightChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
};

/** Compact-view bottom sheet for editing one exercise's planned working-set targets. */
export function SessionTargetsSheet({
  exerciseLabel,
  exerciseId,
  exerciseSlug,
  sessionId,
  targetsSets,
  targetsReps,
  targetsWeightKg,
  targetSuggestionsDisabledExerciseIds,
  isSavingTargets,
  onTargetsSetsChange,
  onTargetsRepsChange,
  onTargetsWeightChange,
  onCancel,
  onSave,
}: SessionTargetsSheetProps) {
  return (
    <SessionBottomSheet title="Set targets" onClose={onCancel}>
      <p className="mb-2 text-xs text-zinc-600">{exerciseLabel}</p>
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
      {exerciseId ? (
        <TargetWeightSuggestion
          exerciseId={exerciseId}
          plannedReps={targetsReps}
          currentReps={targetsReps}
          currentWeightKg={targetsWeightKg}
          excludeSessionId={sessionId ?? null}
          enabled={targetSuggestionsEnabled(!targetSuggestionsDisabledExerciseIds.has(exerciseId))}
          onApply={({ weightKg, reps }) => {
            onTargetsWeightChange(weightKg);
            if (reps != null) {
              onTargetsRepsChange(reps);
            }
          }}
        />
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
        >
          <X className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave()}
          disabled={isSavingTargets}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5 text-white" aria-hidden />
          {isSavingTargets ? "Saving..." : "Save targets"}
        </button>
      </div>
    </SessionBottomSheet>
  );
}
