"use client";

import { ActionButton } from "@/app/components/action-button";
import { TextField } from "@/app/components/text-field";
import { AppDialog } from "@/app/components/app-dialog";
import { DateInput } from "@/app/components/date-input";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
import { SectionHeading } from "@/app/components/section-heading";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { StatusNotice } from "@/app/components/status-notice";
import type { GoalDraft } from "@/app/goals/goal-draft";
import type { ExercisePickerOption } from "@/lib/exercise-picker-options";

export type { GoalDraft } from "@/app/goals/goal-draft";
export { emptyGoalDraft } from "@/app/goals/goal-draft";

type GoalEditorDialogProps = {
  draft: GoalDraft;
  exerciseOptions: ExercisePickerOption[];
  error: string | null;
  isSaving: boolean;
  onChange: (draft: GoalDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

const fieldClassName = "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm";

export function GoalEditorDialog({
  draft,
  exerciseOptions,
  error,
  isSaving,
  onChange,
  onClose,
  onSave,
}: GoalEditorDialogProps) {
  const isEdit = draft.id != null;
  return (
    <AppDialog titleId="goal-editor-title" onClose={onClose}>
      <SectionHeading id="goal-editor-title">{isEdit ? "Edit goal" : "Create goal"}</SectionHeading>
      <p className="mt-1 text-sm text-zinc-600">
        Total (kg) is loaded weight plus the session base. Warm-up sets do not count.
      </p>

      {error ? <StatusNotice message={error} tone="error" className="mt-3" /> : null}

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Exercise
        <ExerciseSearchSelect
          className="mt-1"
          options={exerciseOptions}
          value={draft.exerciseId}
          onChange={(exerciseId) => onChange({ ...draft, exerciseId })}
          placeholder="Select exercise"
          required
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-zinc-800">Goal type</p>
        <SegmentedTabs
          className="mt-1"
          buttonLayout="equal-row"
          buttonMinWidthClassName=""
          tabListAriaLabel="Goal type"
          value={draft.milestoneType}
          onChange={(milestoneType) => onChange({ ...draft, milestoneType })}
          options={[
            { value: "absolute", label: "Total (kg)" },
            { value: "bodyweight_multiple", label: "Bodyweight" },
          ]}
        />
      </div>

      {draft.milestoneType === "absolute" ? (
        <label className="mt-4 block text-sm font-medium text-zinc-800">
          Total (kg)
          <TextField
            value={draft.targetWeightKg}
            onChange={(event) => onChange({ ...draft, targetWeightKg: event.target.value })}
            inputMode="decimal"
            className="mt-1 w-full"
            placeholder="120"
          />
        </label>
      ) : (
        <label className="mt-4 block text-sm font-medium text-zinc-800">
          Bodyweight multiple
          <TextField
            value={draft.bodyweightMultiple}
            onChange={(event) => onChange({ ...draft, bodyweightMultiple: event.target.value })}
            inputMode="decimal"
            className="mt-1 w-full"
            placeholder="1.0"
          />
        </label>
      )}

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Minimum reps
        <TextField
          value={draft.minReps}
          onChange={(event) => onChange({ ...draft, minReps: event.target.value })}
          inputMode="numeric"
          className="mt-1 w-full"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Due date (optional)
        <DateInput
          value={draft.dueOn}
          onChange={(event) => onChange({ ...draft, dueOn: event.target.value })}
          className={fieldClassName}
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Note (optional)
        <textarea
          value={draft.note}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          maxLength={500}
          className={`${fieldClassName} h-20`}
          placeholder="Optional note"
        />
      </label>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <ActionButton type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </ActionButton>
        <ActionButton type="button" variant="primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </ActionButton>
      </div>
    </AppDialog>
  );
}
