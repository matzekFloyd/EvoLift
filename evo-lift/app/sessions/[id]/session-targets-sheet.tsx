"use client";

import { Check } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
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
        <ActionButton type="button" variant="secondary" onClick={onCancel} className="!h-11 !w-auto min-w-0 flex-1">
          Cancel
        </ActionButton>
        <ActionButton
          type="button"
          variant="primary"
          onClick={() => void onSave()}
          disabled={isSavingTargets}
          className="!h-11 !w-auto min-w-0 flex-1"
        >
          <Check className="h-4 w-4" aria-hidden />
          {isSavingTargets ? "Saving..." : "Save targets"}
        </ActionButton>
      </div>
    </SessionBottomSheet>
  );
}
