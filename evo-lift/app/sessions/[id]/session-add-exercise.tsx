"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  ExerciseSearchSelect,
  type ExerciseSearchSelectProps,
} from "@/app/components/exercise-search-select";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { TextField } from "@/app/components/text-field";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import { isAssistanceExercise, targetWeightFieldLabel } from "@/lib/assistance-exercise";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import {
  applyAddExerciseSelection,
  maxExerciseNotesLength,
  type AddExerciseDraft,
} from "./session-detail-model";
import { SessionBottomSheet } from "./session-bottom-sheet";

/** Draft state and lookups shared by the inline panel and the compact bottom sheet. */
type AddExerciseFormProps = {
  draft: AddExerciseDraft;
  setDraft: Dispatch<SetStateAction<AddExerciseDraft>>;
  pickerOptions: ExerciseSearchSelectProps["options"];
  exerciseSlugById: Map<string, string>;
  sessionId: string | undefined;
  targetSuggestionsDisabledExerciseIds: ReadonlySet<string>;
  isAdding: boolean;
  onSubmit: () => void | Promise<void>;
};

function addExerciseFormModel({ draft, setDraft, exerciseSlugById }: AddExerciseFormProps) {
  const slug = draft.exerciseId ? exerciseSlugById.get(draft.exerciseId) : undefined;
  return {
    slug,
    usesAssistance: isAssistanceExercise(slug),
    selectExercise: (exerciseId: string) =>
      setDraft((prev) =>
        applyAddExerciseSelection(prev, exerciseId, exerciseSlugById.get(exerciseId)),
      ),
    setField: (key: keyof AddExerciseDraft, value: string) =>
      setDraft((prev) => ({ ...prev, [key]: value })),
  };
}

function AddExerciseSelect({
  props,
  selectExercise,
}: {
  props: AddExerciseFormProps;
  selectExercise: (exerciseId: string) => void;
}) {
  return (
    <ExerciseSearchSelect
      className="mt-1 w-full"
      options={props.pickerOptions}
      value={props.draft.exerciseId}
      onChange={selectExercise}
    />
  );
}

function AddExerciseSuggestion({
  props,
  setField,
}: {
  props: AddExerciseFormProps;
  setField: (key: keyof AddExerciseDraft, value: string) => void;
}) {
  const { draft } = props;
  return (
    <TargetWeightSuggestion
      exerciseId={draft.exerciseId}
      plannedReps={draft.targetReps}
      currentReps={draft.targetReps}
      currentWeightKg={draft.targetWeightKg}
      excludeSessionId={props.sessionId ?? null}
      enabled={targetSuggestionsEnabled(
        !props.targetSuggestionsDisabledExerciseIds.has(draft.exerciseId),
      )}
      onApply={({ weightKg, reps }) => {
        setField("targetWeightKg", weightKg);
        if (reps != null) {
          setField("targetReps", reps);
        }
      }}
    />
  );
}

type SessionAddExercisePanelProps = AddExerciseFormProps & {
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

/** Inline (md+) panel for adding an exercise to the session. */
export function SessionAddExercisePanel(props: SessionAddExercisePanelProps) {
  const { draft, isAdding, isExpanded, onToggleExpanded, onSubmit } = props;
  const { slug, usesAssistance, selectExercise, setField } = addExerciseFormModel(props);

  return (
    <section className="panel mt-4 p-5 text-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 hover:text-zinc-900"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse add exercise section" : "Expand add exercise section"}
        >
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
          className="text-base font-medium hover:text-zinc-900"
        >
          Add exercise to this session
        </button>
      </div>
      {isExpanded ? (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Exercise
              <AddExerciseSelect props={props} selectExercise={selectExercise} />
            </label>
            {usesAssistance ? null : (
              <label className="block text-sm font-medium">
                Base weight (kg)
                <TextField
                  type="number"
                  min={0}
                  step="0.25"
                  value={draft.baseWeightKg}
                  onChange={(event) => setField("baseWeightKg", event.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g. 20"
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {[20, 15, 10, 0].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField("baseWeightKg", value === 0 ? "" : String(value))}
                      className="rounded border bg-white px-2 py-0.5 text-xs"
                    >
                      +{value}
                    </button>
                  ))}
                </div>
              </label>
            )}
            <p className="text-xs text-zinc-600 sm:col-span-2">
              Target fields apply to working sets only; warmups do not count.
            </p>
            <label className="block text-sm font-medium">
              Target working sets
              <TextField
                type="number"
                min={1}
                value={draft.targetSets}
                onChange={(event) => setField("targetSets", event.target.value)}
                className="mt-1 w-full"
                placeholder="e.g. 3"
              />
            </label>
            <label className="block text-sm font-medium">
              {targetWeightFieldLabel(slug)}
              <TextField
                type="number"
                min={0}
                step="0.25"
                value={draft.targetWeightKg}
                onChange={(event) => setField("targetWeightKg", event.target.value)}
                className="mt-1 w-full"
                placeholder="e.g. 60"
              />
            </label>
            <label className="block text-sm font-medium">
              Target reps (working sets)
              <TextField
                type="number"
                min={1}
                value={draft.targetReps}
                onChange={(event) => setField("targetReps", event.target.value)}
                className="mt-1 w-full"
                placeholder="e.g. 8"
              />
            </label>
            {draft.exerciseId ? (
              <div className="sm:col-span-2">
                <AddExerciseSuggestion props={props} setField={setField} />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <NotesTextareaField
                label="Notes (optional)"
                value={draft.notes}
                onChange={(nextValue) => setField("notes", nextValue)}
                placeholder="Optional exercise notes"
                maxLength={maxExerciseNotesLength}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isAdding}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5 text-sky-700" aria-hidden />
              {isAdding ? "Adding..." : "Add exercise"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

type SessionAddExerciseSheetProps = AddExerciseFormProps & {
  onClose: () => void;
};

/** Compact-view bottom sheet for adding an exercise to the session. */
export function SessionAddExerciseSheet(props: SessionAddExerciseSheetProps) {
  const { draft, isAdding, onClose, onSubmit } = props;
  const { slug, usesAssistance, selectExercise, setField } = addExerciseFormModel(props);

  return (
    <SessionBottomSheet title="Add exercise" onClose={onClose} className="md:hidden">
      <div className="grid gap-3">
        <label className="block text-sm font-medium">
          Exercise
          <AddExerciseSelect props={props} selectExercise={selectExercise} />
        </label>
        <p className="text-xs text-zinc-600">
          Target fields apply to working sets only; warmups do not count.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {usesAssistance ? null : (
            <label className="block text-sm font-medium">
              Base (kg)
              <TextField
                type="number"
                min={0}
                step="0.25"
                value={draft.baseWeightKg}
                onChange={(event) => setField("baseWeightKg", event.target.value)}
                className="mt-1 w-full"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Target working sets
            <TextField
              type="number"
              min={1}
              value={draft.targetSets}
              onChange={(event) => setField("targetSets", event.target.value)}
              className="mt-1 w-full"
              placeholder="e.g. 3"
            />
          </label>
          <label className="block text-sm font-medium">
            {targetWeightFieldLabel(slug)}
            <TextField
              type="number"
              min={0}
              step="0.25"
              value={draft.targetWeightKg}
              onChange={(event) => setField("targetWeightKg", event.target.value)}
              className="mt-1 w-full"
              placeholder="e.g. 60"
            />
          </label>
          <label className="block text-sm font-medium">
            Target reps (working sets)
            <TextField
              type="number"
              min={1}
              value={draft.targetReps}
              onChange={(event) => setField("targetReps", event.target.value)}
              className="mt-1 w-full"
              placeholder="e.g. 8"
            />
          </label>
        </div>
        {draft.exerciseId ? <AddExerciseSuggestion props={props} setField={setField} /> : null}
        <NotesTextareaField
          label="Notes (optional)"
          value={draft.notes}
          onChange={(nextValue) => setField("notes", nextValue)}
          placeholder="Optional exercise notes"
          maxLength={maxExerciseNotesLength}
        />
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isAdding}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5 text-white" aria-hidden />
            {isAdding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </SessionBottomSheet>
  );
}
