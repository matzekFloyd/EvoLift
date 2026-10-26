"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eraser,
  NotebookPen,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { RequiredMark } from "@/app/components/editor-chrome";
import { panelInsetClass } from "@/app/components/panel-inset";
import { SectionHeading } from "@/app/components/section-heading";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
import { InfoPopover } from "@/app/components/info-popover";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { TextField } from "@/app/components/text-field";
import { TargetWeightSuggestion } from "@/app/components/target-weight-suggestion";
import {
  createEmptyExerciseRow,
  insertExerciseRowAfter,
  shiftIndexesAfterInsert,
  type ExerciseDefaultsRow,
  type ExerciseDraftRow,
} from "@/lib/workout-exercise-draft";
import { isAssistanceExercise, targetWeightFieldLabel } from "@/lib/assistance-exercise";
import { exerciseDraftScan } from "@/lib/exercise-draft-scan";
import { targetSuggestionsEnabled } from "@/lib/target-weight-suggestion";
import { exerciseOptionsForPicker } from "@/lib/exercise-picker-options";

function ExerciseScanText({ name, details }: { name: string; details: string }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-medium text-zinc-800">{name}</span>
      {details ? <span className="font-normal text-zinc-600">{details}</span> : null}
    </span>
  );
}

function filledExerciseIds(rows: ExerciseDraftRow[]): Set<string> {
  return new Set(rows.filter((row) => row.exerciseId).map((row) => row.rowId));
}

/** Same weight as Remove's soft red. Save stays the filled sky button. */
const buildActionClassName =
  "!border-sky-300 !bg-sky-50 !text-sky-800 hover:!border-sky-400 hover:!bg-sky-100";

export type WorkoutExerciseDraftListProps = {
  exerciseRows: ExerciseDraftRow[];
  setExerciseRows: React.Dispatch<React.SetStateAction<ExerciseDraftRow[]>>;
  exerciseOptions: Array<{ id: string; label: string; slug: string }>;
  hiddenExerciseIds: Set<string>;
  exerciseDefaultsById: Map<string, ExerciseDefaultsRow>;
  maxNotesLength?: number;
  onClearDraft?: () => void;
  /** Session planning only. Template editing leaves this off. */
  showTargetWeightSuggestion?: boolean;
  /** `field` matches a nearby field label. `section` is the page heading. */
  heading?: "section" | "field";
};

export function WorkoutExerciseDraftList({
  exerciseRows,
  setExerciseRows,
  exerciseOptions,
  hiddenExerciseIds,
  exerciseDefaultsById,
  maxNotesLength = 500,
  onClearDraft,
  showTargetWeightSuggestion = false,
  heading = "section",
}: WorkoutExerciseDraftListProps) {
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Set<number>>(new Set());
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(() =>
    filledExerciseIds(exerciseRows),
  );
  const [isSmallPhone, setIsSmallPhone] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsSmallPhone(mediaQuery.matches);
    apply();
    const onChange = () => apply();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (activeExerciseIndex >= exerciseRows.length) {
      // Clamp when a row is removed; keeps compact "one exercise" view aligned.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI index to shorter list
      setActiveExerciseIndex(Math.max(0, exerciseRows.length - 1));
    }
  }, [activeExerciseIndex, exerciseRows.length]);

  const exerciseSlugById = new Map(
    exerciseOptions.map((option) => [option.id, option.slug] as const),
  );

  function addExerciseRow(afterIndex?: number) {
    const row = createEmptyExerciseRow();
    if (afterIndex == null) {
      setExerciseRows((prev) => [...prev, row]);
      return;
    }
    const insertAt = afterIndex + 1;
    setExerciseRows((prev) => insertExerciseRowAfter(prev, afterIndex, row));
    setExpandedExerciseNotes((prev) => shiftIndexesAfterInsert(prev, insertAt));
  }

  function removeExerciseRow(index: number) {
    const removedRowId = exerciseRows[index]?.rowId ?? null;
    setExerciseRows((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setExpandedExerciseNotes((prev) => {
      const next = new Set<number>();
      for (const currentIndex of prev) {
        if (currentIndex === index) {
          continue;
        }
        next.add(currentIndex > index ? currentIndex - 1 : currentIndex);
      }
      return next;
    });
    if (removedRowId) {
      setCollapsedExercises((prev) => {
        const next = new Set(prev);
        next.delete(removedRowId);
        return next;
      });
    }
  }

  function updateExerciseRow(
    index: number,
    key:
      | "exerciseId"
      | "baseWeightKg"
      | "targetSets"
      | "targetReps"
      | "targetWeightKg"
      | "notes",
    value: string,
  ) {
    setExerciseRows((prev) =>
      prev.map((row, currentIndex) =>
        currentIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }

  function handleExerciseSelect(index: number, selectedExerciseId: string) {
    setExerciseRows((prev) =>
      prev.map((row, currentIndex) => {
        if (currentIndex !== index) {
          return row;
        }

        const defaults = exerciseDefaultsById.get(selectedExerciseId);
        const selectedSlug = exerciseSlugById.get(selectedExerciseId);
        const assistance = isAssistanceExercise(selectedSlug);
        if (!defaults) {
          return {
            ...row,
            exerciseId: selectedExerciseId,
            baseWeightKg: assistance ? "" : row.baseWeightKg,
          };
        }

        return {
          ...row,
          exerciseId: selectedExerciseId,
          baseWeightKg: assistance
            ? ""
            : row.baseWeightKg || defaults.default_base_weight_kg == null
              ? row.baseWeightKg
              : String(defaults.default_base_weight_kg),
          targetSets:
            row.targetSets || defaults.default_target_sets == null
              ? row.targetSets
              : String(defaults.default_target_sets),
          targetReps:
            row.targetReps || defaults.default_target_reps == null
              ? row.targetReps
              : String(defaults.default_target_reps),
          targetWeightKg:
            row.targetWeightKg || defaults.default_target_weight_kg == null
              ? row.targetWeightKg
              : String(defaults.default_target_weight_kg),
        };
      }),
    );
  }

  function toggleExerciseNotes(index: number) {
    setExpandedExerciseNotes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleExerciseCollapsed(rowId: string) {
    setCollapsedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  function collapseExercise(rowId: string) {
    setCollapsedExercises((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
    document.getElementById(`exercise-toggle-${rowId}`)?.focus();
  }

  function renderTargetWeightSuggestion(row: ExerciseDraftRow, index: number) {
    if (!showTargetWeightSuggestion || !row.exerciseId) {
      return null;
    }
    if (!targetSuggestionsEnabled(exerciseDefaultsById.get(row.exerciseId)?.suggest_target)) {
      return null;
    }
    return (
      <TargetWeightSuggestion
        exerciseId={row.exerciseId}
        plannedReps={row.targetReps}
        currentReps={row.targetReps}
        currentWeightKg={row.targetWeightKg}
        onApply={({ weightKg, reps }) => {
          updateExerciseRow(index, "targetWeightKg", weightKg);
          if (reps != null) {
            updateExerciseRow(index, "targetReps", reps);
          }
        }}
      />
    );
  }

  function focusExercisePicker(index: number) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const rowRoot = document.querySelector(`[data-exercise-row-id="row-${index}"]`);
        if (!(rowRoot instanceof HTMLElement)) {
          return;
        }
        const nextFocusable = rowRoot.querySelector<HTMLElement>(
          'input, button[role="combobox"], [role="combobox"], button, [tabindex]:not([tabindex="-1"])',
        );
        nextFocusable?.focus();
      });
    });
  }

  const isCompactView = isSmallPhone;
  const visibleExerciseRows = isCompactView
    ? exerciseRows
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => index === activeExerciseIndex)
    : exerciseRows.map((row, index) => ({ row, index }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {heading === "field" ? (
          <h2 className="text-sm font-medium text-zinc-900">Exercises</h2>
        ) : (
          <SectionHeading>Exercises</SectionHeading>
        )}
        {isCompactView && exerciseRows.length > 0 ? (
          <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">
            Exercise {activeExerciseIndex + 1} of {exerciseRows.length}
          </span>
        ) : null}
        <div className={`flex items-center gap-2 ${isCompactView ? "hidden" : ""}`}>
          {onClearDraft ? (
            <ActionButton
              type="button"
              onClick={onClearDraft}
              variant="secondary"
              size="sm"
              className="px-2 py-1 text-xs font-normal"
              iconColor="amber"
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden />
              Clear draft
            </ActionButton>
          ) : null}
          <ActionButton
            type="button"
            onClick={() => addExerciseRow()}
            variant="secondary"
            size="sm"
            iconColor="sky"
            className={`px-2 py-1 text-xs ${buildActionClassName}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add exercise
          </ActionButton>
        </div>
      </div>
      {isCompactView ? (
        <div className="grid grid-cols-2 gap-2">
          {onClearDraft ? (
            <ActionButton
              type="button"
              onClick={onClearDraft}
              variant="secondary"
              size="sm"
              fullWidth
              iconColor="amber"
              className="!h-12 px-2 text-xs font-normal leading-tight"
            >
              <Eraser className="h-4 w-4" aria-hidden />
              Clear draft
            </ActionButton>
          ) : null}
          <ActionButton
            type="button"
            onClick={() => addExerciseRow()}
            variant="secondary"
            size="sm"
            fullWidth
            iconColor="sky"
            className={`!h-12 px-2 text-xs leading-tight ${buildActionClassName} ${onClearDraft ? "" : "col-span-2"}`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add exercise
          </ActionButton>
        </div>
      ) : null}
      {visibleExerciseRows.map(({ row, index }) => {
        const rowSlug = row.exerciseId ? exerciseSlugById.get(row.exerciseId) : undefined;
        const rowUsesAssistance = isAssistanceExercise(rowSlug);
        const selectedLabel = row.exerciseId
          ? (exerciseOptions.find((option) => option.id === row.exerciseId)?.label ?? null)
          : null;
        const scan = exerciseDraftScan({
          label: selectedLabel,
          baseWeightKg: row.baseWeightKg,
          targetSets: row.targetSets,
          targetWeightKg: row.targetWeightKg,
          targetReps: row.targetReps,
          usesAssistance: rowUsesAssistance,
        });
        const exerciseCollapsed = collapsedExercises.has(row.rowId);
        return (
        <div
          key={row.rowId}
          data-exercise-row-id={`row-${index}`}
          onFocusCapture={() => setActiveExerciseIndex(index)}
          className={
            isCompactView
              ? panelInsetClass("p-3")
              : panelInsetClass("p-5 text-sm")
          }
        >
          <div className="mb-2 mt-1 flex items-center justify-between">
            {isCompactView ? (
              <div className="min-w-0 text-left text-sm">
                <span className="block font-medium text-zinc-800">{scan.name}</span>
                <span
                  className="mt-0.5 block font-normal text-zinc-600"
                  {...(scan.details ? {} : { "aria-hidden": true })}
                >
                  {scan.details || "-"}
                </span>
              </div>
            ) : (
              <button
                id={`exercise-toggle-${row.rowId}`}
                type="button"
                onClick={() => toggleExerciseCollapsed(row.rowId)}
                className="inline-flex min-h-6 min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                aria-expanded={!exerciseCollapsed}
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
                  {exerciseCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </span>
                <ExerciseScanText name={scan.name} details={scan.details} />
              </button>
            )}
            <div className="inline-flex min-h-6 items-center gap-2">
              {exerciseRows.length > 1 ? (
                <ActionButton
                  type="button"
                  onClick={() => removeExerciseRow(index)}
                  variant="danger"
                  size="sm"
                  className="h-8 px-2 py-1 text-xs font-normal"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </ActionButton>
              ) : null}
            </div>
          </div>
          {isCompactView ? (
            <>
              <div className="mt-5 grid grid-cols-12 items-start gap-2">
                <label
                  className={`${rowUsesAssistance ? "col-span-12" : "col-span-8"} block text-xs font-medium`}
                >
                  <span className="inline-flex items-center gap-1">
                    Exercise
                    <RequiredMark />
                  </span>
                  <ExerciseSearchSelect
                    required
                    size="compact"
                    className="mt-1 w-full"
                    options={exerciseOptionsForPicker(
                      exerciseOptions,
                      hiddenExerciseIds,
                      row.exerciseId,
                    )}
                    value={row.exerciseId}
                    onChange={(exerciseId) => handleExerciseSelect(index, exerciseId)}
                  />
                </label>
                {rowUsesAssistance ? null : (
                  <label className="col-span-4 block text-xs font-medium">
                    Base weight (kg)
                    <TextField
                      type="number"
                      min={0}
                      step="0.25"
                      value={row.baseWeightKg}
                      onChange={(event) =>
                        updateExerciseRow(index, "baseWeightKg", event.target.value)
                      }
                      size="compact"
                      className="mt-1 w-full"
                      placeholder="e.g. 20"
                    />
                    <div className="mt-1 flex flex-wrap gap-1">
                      {[20, 15, 10, 0].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateExerciseRow(
                              index,
                              "baseWeightKg",
                              value === 0 ? "" : String(value),
                            )
                          }
                          className="rounded border bg-white px-2 py-0.5 text-[11px]"
                        >
                          +{value}
                        </button>
                      ))}
                    </div>
                  </label>
                )}
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1">
                  <p className="text-sm font-semibold text-zinc-800">Targets</p>
                  <InfoPopover
                    label="How targets work"
                    panelAlign="left"
                    className="[&>button]:h-5 [&>button]:w-5 [&>button]:text-zinc-500"
                  >
                    <p>
                      Sets, weight, and reps here are targets for your working sets. Warmup sets are
                      tracked separately when you log the session.
                    </p>
                  </InfoPopover>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="col-span-1 block text-xs font-medium">
                    Sets
                    <TextField
                      type="number"
                      min={1}
                      value={row.targetSets}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetSets", event.target.value)
                      }
                      size="compact"
                      className="mt-1 w-full"
                      placeholder="e.g. 3"
                    />
                  </label>
                  <label className="col-span-1 block text-xs font-medium">
                    {targetWeightFieldLabel(
                      row.exerciseId ? exerciseSlugById.get(row.exerciseId) : undefined,
                    )}
                    <TextField
                      type="number"
                      min={0}
                      step="0.25"
                      value={row.targetWeightKg}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetWeightKg", event.target.value)
                      }
                      size="compact"
                      className="mt-1 w-full"
                      placeholder="e.g. 60"
                    />
                  </label>
                  <label className="col-span-1 block text-xs font-medium">
                    Reps
                    <TextField
                      type="number"
                      min={1}
                      value={row.targetReps}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetReps", event.target.value)
                      }
                      size="compact"
                      className="mt-1 w-full"
                      placeholder="e.g. 8"
                    />
                  </label>
                </div>
                {renderTargetWeightSuggestion(row, index)}
              </div>
              <div className="mt-6 block text-sm font-medium">
                <button
                  type="button"
                  onClick={() => toggleExerciseNotes(index)}
                  className="inline-flex items-center gap-1 text-left text-sm font-medium hover:text-sky-700"
                >
                  <NotebookPen className="h-3.5 w-3.5 text-zinc-500" />
                  {expandedExerciseNotes.has(index)
                    ? "Hide exercise notes"
                    : "Add exercise notes"}
                </button>
                {expandedExerciseNotes.has(index) ? (
                  <NotesTextareaField
                    value={row.notes}
                    onChange={(nextValue) => updateExerciseRow(index, "notes", nextValue)}
                    placeholder="Optional notes for this exercise"
                    maxLength={maxNotesLength}
                    heightClassName="h-20"
                  />
                ) : null}
              </div>
              <div className="mt-4 flex flex-col gap-1 border-t border-zinc-200 pt-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    iconColor="sky"
                    className={buildActionClassName}
                    disabled={!row.exerciseId}
                    onClick={() => {
                      collapseExercise(row.rowId);
                      const nextRowIndex = index + 1;
                      addExerciseRow(index);
                      setActiveExerciseIndex(nextRowIndex);
                      focusExercisePicker(nextRowIndex);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add next
                  </ActionButton>
                </div>
                {exerciseRows.length > 1 ? (
                  <div className="mt-2 flex gap-2 border-t border-zinc-200/70 pt-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="min-w-0 flex-1 font-normal"
                      disabled={activeExerciseIndex === 0}
                      onClick={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      Previous exercise
                    </ActionButton>
                    {activeExerciseIndex < exerciseRows.length - 1 ? (
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        fullWidth
                        className="min-w-0 flex-1 font-normal"
                        disabled={!row.exerciseId}
                        onClick={() =>
                          setActiveExerciseIndex((prev) =>
                            Math.min(exerciseRows.length - 1, prev + 1),
                          )
                        }
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        Next exercise
                      </ActionButton>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : collapsedExercises.has(row.rowId) ? null : (
            <>
              <div className="mt-5">
                <div className="grid grid-cols-12 items-start gap-2">
                  <label
                    className={`${rowUsesAssistance ? "col-span-12" : "col-span-8"} block text-sm font-medium`}
                  >
                    <span className="inline-flex items-center gap-1">
                      Exercise
                      <RequiredMark />
                    </span>
                    <ExerciseSearchSelect
                      required
                      className="mt-1 w-full"
                      options={exerciseOptionsForPicker(
                        exerciseOptions,
                        hiddenExerciseIds,
                        row.exerciseId,
                      )}
                      value={row.exerciseId}
                      onChange={(exerciseId) => handleExerciseSelect(index, exerciseId)}
                    />
                  </label>
                  {rowUsesAssistance ? null : (
                    <label className="col-span-4 block text-sm font-medium">
                      Base weight (kg)
                      <TextField
                        type="number"
                        min={0}
                        step="0.25"
                        value={row.baseWeightKg}
                        onChange={(event) =>
                          updateExerciseRow(index, "baseWeightKg", event.target.value)
                        }
                        className="mt-1 w-full"
                        placeholder="e.g. 20"
                      />
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[20, 15, 10, 0].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              updateExerciseRow(
                                index,
                                "baseWeightKg",
                                value === 0 ? "" : String(value),
                              )
                            }
                            className="rounded border bg-white px-2 py-0.5 text-xs"
                          >
                            +{value}
                          </button>
                        ))}
                      </div>
                    </label>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-zinc-800">Targets</p>
                    <InfoPopover label="How targets work" className="[&>button]:text-zinc-500">
                      <p>
                        Sets, weight, and reps here are targets for your working sets. Warmup sets
                        are tracked separately when you log the session.
                      </p>
                    </InfoPopover>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="grid grid-cols-12 items-end gap-2">
                  <label className="col-span-4 block text-sm font-medium">
                    Sets
                    <TextField
                      type="number"
                      min={1}
                      value={row.targetSets}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetSets", event.target.value)
                      }
                      className="mt-1 w-full"
                      placeholder="e.g. 3"
                    />
                  </label>
                  <label className="col-span-4 block text-sm font-medium">
                    {targetWeightFieldLabel(
                      row.exerciseId ? exerciseSlugById.get(row.exerciseId) : undefined,
                    )}
                    <TextField
                      type="number"
                      min={0}
                      step="0.25"
                      value={row.targetWeightKg}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetWeightKg", event.target.value)
                      }
                      className="mt-1 w-full"
                      placeholder="e.g. 60"
                    />
                  </label>
                  <label className="col-span-4 block text-sm font-medium">
                    Reps
                    <TextField
                      type="number"
                      min={1}
                      value={row.targetReps}
                      onChange={(event) =>
                        updateExerciseRow(index, "targetReps", event.target.value)
                      }
                      className="mt-1 w-full"
                      placeholder="e.g. 8"
                    />
                  </label>
                </div>
                {renderTargetWeightSuggestion(row, index)}
              </div>
              <div className="mt-5 block text-sm font-medium">
                <button
                  type="button"
                  onClick={() => toggleExerciseNotes(index)}
                  className="inline-flex items-center gap-1 text-left text-sm font-medium hover:text-sky-700"
                >
                  <NotebookPen className="h-3.5 w-3.5 text-zinc-500" />
                  {expandedExerciseNotes.has(index)
                    ? "Hide exercise notes"
                    : "Add exercise notes"}
                </button>
                {expandedExerciseNotes.has(index) ? (
                  <NotesTextareaField
                    value={row.notes}
                    onChange={(nextValue) => updateExerciseRow(index, "notes", nextValue)}
                    placeholder="Optional notes for this exercise"
                    maxLength={maxNotesLength}
                    heightClassName="h-20"
                  />
                ) : null}
              </div>
              <div className="mt-5 flex flex-col items-end gap-1 border-t border-zinc-200 pt-4">
                <div className="flex w-full flex-col items-stretch justify-end gap-2 sm:w-1/3 sm:flex-row sm:items-center">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sm:flex-1"
                    disabled={!row.exerciseId}
                    onClick={() => collapseExercise(row.rowId)}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Done
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    iconColor="sky"
                    className={`sm:flex-1 ${buildActionClassName}`}
                    disabled={!row.exerciseId}
                    onClick={() => {
                      collapseExercise(row.rowId);
                      const nextRowIndex = index + 1;
                      addExerciseRow(index);
                      setActiveExerciseIndex(nextRowIndex);
                      focusExercisePicker(nextRowIndex);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add next
                  </ActionButton>
                </div>
              </div>
            </>
          )}
        </div>
        );
      })}
    </div>
  );
}
