"use client";

import { Check, CheckCircle2, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useLayoutEffect, useRef, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { CompactRowActions } from "@/app/components/compact-row-actions";
import { panelInsetClass } from "@/app/components/panel-inset";
import {
  externalLoadFieldLabel,
  externalLoadValuePrefix,
  isAssistanceExercise,
} from "@/lib/assistance-exercise";
import { setsToShowForSkippedExercise } from "./session-exercise-status";
import { SetKindIndicator } from "@/app/components/set-kind-indicator";
import { shouldShowSetSummarySeparator } from "./compact-set-summary";
import { canEditSetAsWarmup, showWarmupSetToggle, type SessionSetDraft } from "./session-set-draft";
import type { WorkoutSetRow } from "./session-detail-actions";

function CompactLoggedSetSummary({
  isWarmup,
  setNumber,
  weightKg,
  reps,
}: {
  isWarmup: boolean;
  setNumber: number;
  weightKg: number | null;
  reps: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const setRef = useRef<HTMLSpanElement>(null);
  const loadRef = useRef<HTMLSpanElement>(null);
  const separatorRef = useRef<HTMLSpanElement>(null);
  const [showSeparator, setShowSeparator] = useState(true);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const line = lineRef.current;
    const setEl = setRef.current;
    const loadEl = loadRef.current;
    const separatorEl = separatorRef.current;
    if (!container || !line || !setEl || !loadEl || !separatorEl) {
      return;
    }

    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(line).columnGap) || 0;
      setShowSeparator(
        shouldShowSetSummarySeparator({
          containerWidth: container.clientWidth,
          setWidth: setEl.getBoundingClientRect().width,
          loadWidth: loadEl.getBoundingClientRect().width,
          separatorWidth: separatorEl.getBoundingClientRect().width,
          gap,
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isWarmup, reps, setNumber, weightKg]);

  return (
    <span ref={containerRef} className="relative block min-w-0">
      <span ref={separatorRef} aria-hidden className="pointer-events-none absolute w-max opacity-0">
        ·
      </span>
      <span ref={lineRef} className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
        <span ref={setRef} className="inline-flex items-center gap-1.5">
          <SetKindIndicator isWarmup={isWarmup} density="compact" />
          <span className="font-medium text-zinc-900">Set {setNumber}</span>
        </span>
        {showSeparator ? <span className="text-zinc-500">·</span> : null}
        <span ref={loadRef}>
          {weightKg ?? "-"} kg, {reps} reps
        </span>
      </span>
    </span>
  );
}

type SessionExerciseSetsProps = {
  sessionExerciseId: string;
  exerciseSlug?: string | null;
  baseWeightKg: number | null;
  sets: WorkoutSetRow[];
  addDraft: SessionSetDraft;
  lastSet: WorkoutSetRow | null;
  exerciseIndex: number;
  exerciseCount: number;
  isCompactView: boolean;
  canManageSets: boolean;
  isPlannedSession: boolean;
  isSavingSet: boolean;
  shouldUseSingleExerciseFlow: boolean;
  targetSetsMet: boolean;
  notDone?: boolean;
  compactShowExtraSetComposer: boolean;
  fullAddSetRowExpanded: boolean;
  editingSetId: string | null;
  editDraft: SessionSetDraft;
  onEditDraftChange: Dispatch<SetStateAction<SessionSetDraft>>;
  onUpdateAddDraft: (key: keyof SessionSetDraft, value: string | boolean) => void;
  onAddSet: () => void;
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

export function SessionExerciseSets({
  sessionExerciseId,
  exerciseSlug = null,
  baseWeightKg,
  sets,
  addDraft,
  lastSet,
  exerciseIndex,
  exerciseCount,
  isCompactView,
  canManageSets,
  isPlannedSession,
  isSavingSet,
  shouldUseSingleExerciseFlow,
  targetSetsMet,
  notDone = false,
  compactShowExtraSetComposer,
  fullAddSetRowExpanded,
  editingSetId,
  editDraft,
  onEditDraftChange,
  onUpdateAddDraft,
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
}: SessionExerciseSetsProps) {
  const visibleSets = setsToShowForSkippedExercise(sets, notDone);
  const showWarmupToggle = showWarmupSetToggle(lastSet?.is_warmup ?? null);
  const loadFieldLabel = externalLoadFieldLabel(exerciseSlug);
  const loadValuePrefix = externalLoadValuePrefix(exerciseSlug);
  const assistance = isAssistanceExercise(exerciseSlug);
  const hideCompactNewSetComposer =
    shouldUseSingleExerciseFlow && targetSetsMet && canManageSets && !compactShowExtraSetComposer;
  const hideFullViewAddSetRow = targetSetsMet && canManageSets && !fullAddSetRowExpanded;

  return (
    <>
      <div className="mt-3 space-y-3 md:hidden">
        {visibleSets.map((set, setIndex) =>
          editingSetId === set.id ? (
            <div
              key={set.id}
              data-compact-set-row=""
              data-compact-last-set={setIndex === visibleSets.length - 1 ? "" : undefined}
              className={panelInsetClass("p-3")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="shrink-0 text-sm font-medium text-zinc-900">Set {set.set_number}</p>
                {canEditSetAsWarmup(visibleSets, set.id) ? (
                  <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={editDraft.isWarmup}
                      onChange={(event) =>
                        onEditDraftChange((prev) => ({ ...prev, isWarmup: event.target.checked }))
                      }
                    />
                    Warmup?
                  </label>
                ) : null}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-zinc-600">
                  {loadFieldLabel}
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={editDraft.weightKg}
                    onChange={(event) =>
                      onEditDraftChange((prev) => ({ ...prev, weightKg: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border bg-white px-2 py-1"
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Reps
                  <input
                    type="number"
                    min={1}
                    value={editDraft.reps}
                    onChange={(event) =>
                      onEditDraftChange((prev) => ({ ...prev, reps: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border bg-white px-2 py-1"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <CompactRowActions
                  isEditing
                  onEdit={() => {}}
                  onSave={() => onSaveEdit(set.id)}
                  onCancel={onCancelEdit}
                />
              </div>
            </div>
          ) : (
            <div
              key={set.id}
              data-compact-set-row=""
              data-compact-last-set={setIndex === visibleSets.length - 1 ? "" : undefined}
              className={panelInsetClass("p-3")}
            >
              {isCompactView ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 text-sm text-zinc-700">
                    <CompactLoggedSetSummary
                      isWarmup={set.is_warmup}
                      setNumber={set.set_number}
                      weightKg={set.weight_kg}
                      reps={set.reps}
                    />
                  </div>
                  {canManageSets ? (
                    <div className="flex shrink-0 items-center">
                      <CompactRowActions
                        isEditing={false}
                        onEdit={() => onStartEdit(set)}
                        onSave={() => {}}
                        onCancel={() => {}}
                        onSecondary={() => onDeleteSet(set.id)}
                        secondaryLabel="Delete"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="inline-flex flex-wrap items-center gap-2 text-sm font-medium">
                      <SetKindIndicator isWarmup={set.is_warmup} density="default" />
                      <span>Set {set.set_number}</span>
                    </p>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">{loadValuePrefix}:</span> {set.weight_kg ?? "-"} kg
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Reps:</span> {set.reps}
                  </p>
                  {assistance ? (
                    <p className="text-xs text-zinc-600">
                      {set.weight_kg == null || Number(set.weight_kg) === 0
                        ? "Unassisted bodyweight."
                        : "Assistance, not added load."}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-600">
                      Total: {((set.weight_kg ?? 0) + (baseWeightKg ?? 0)).toFixed(1)} kg
                    </p>
                  )}
                  {canManageSets ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onDeleteSet(set.id)}
                        disabled={isSavingSet}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartEdit(set)}
                        disabled={isSavingSet}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50"
                      >
                        <Pencil className="h-3 w-3 text-sky-700" />
                        Edit
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ),
        )}
        {canManageSets ? (
          hideCompactNewSetComposer ? (
            <div
              data-compact-next-action=""
              className="rounded-md border border-sky-200 bg-sky-50/70 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            >
              <p className="text-sm font-medium text-sky-950">All target working sets logged.</p>
              {exerciseIndex < exerciseCount - 1 ? (
                <ActionButton
                  type="button"
                  variant="primary"
                  fullWidth
                  className="mt-2"
                  onClick={onNextExercise}
                >
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  Next exercise
                </ActionButton>
              ) : onMarkCompleted ? (
                <ActionButton
                  type="button"
                  variant="primary"
                  fullWidth
                  className="mt-2"
                  disabled={isMarkingCompleted || isSavingSet}
                  onClick={onMarkCompleted}
                >
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                  {isMarkingCompleted ? "Saving..." : "Finish session"}
                </ActionButton>
              ) : (
                <p className="mt-2 text-xs text-zinc-600">
                  Last exercise in this session. Add another exercise when you are ready, or finish
                  logging.
                </p>
              )}
              {exerciseIndex < exerciseCount - 1 && onMarkCompleted ? (
                <ActionButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="mt-2"
                  disabled={isMarkingCompleted || isSavingSet}
                  onClick={onMarkCompleted}
                >
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                  {isMarkingCompleted ? "Saving..." : "Finish session"}
                </ActionButton>
              ) : null}
              {exerciseIndex >= exerciseCount - 1 ? (
                <ActionButton
                  type="button"
                  variant={onMarkCompleted ? "secondary" : "primary"}
                  fullWidth
                  className="mt-2"
                  onClick={onAddExercise}
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Add exercise
                </ActionButton>
              ) : null}
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                className="mt-2"
                title="Show the add-set form to log more sets."
                onClick={onShowExtraSets}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                Add more sets
              </ActionButton>
            </div>
          ) : (
            <div
              id={`compact-new-set-panel-${sessionExerciseId}`}
              data-compact-next-action=""
              className="rounded-md border border-sky-300 bg-sky-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-sky-950">
                  <Plus className="h-3 w-3 text-sky-700" aria-hidden />
                  New set
                </p>
                {showWarmupToggle ? (
                  <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={addDraft.isWarmup}
                      onChange={(event) => onUpdateAddDraft("isWarmup", event.target.checked)}
                    />
                    Warmup?
                  </label>
                ) : (
                  <SetKindIndicator isWarmup={false} density="compact" />
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-sm font-medium text-zinc-700">
                  {loadFieldLabel}
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={addDraft.weightKg}
                    onChange={(event) => onUpdateAddDraft("weightKg", event.target.value)}
                    className="mt-1 w-full rounded-md border bg-white px-2 py-1"
                    placeholder={assistance ? "Assistance" : "Weight"}
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAddDraft(
                          "weightKg",
                          String(
                            Math.max(0, Number((Number(addDraft.weightKg || "0") - 2.5).toFixed(1))),
                          ),
                        )
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-800"
                    >
                      -2.5
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAddDraft(
                          "weightKg",
                          String(Number((Number(addDraft.weightKg || "0") + 2.5).toFixed(1))),
                        )
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-800"
                    >
                      +2.5
                    </button>
                  </div>
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Reps
                  <input
                    type="number"
                    min={1}
                    value={addDraft.reps}
                    onChange={(event) => onUpdateAddDraft("reps", event.target.value)}
                    className="mt-1 w-full rounded-md border bg-white px-2 py-1"
                    placeholder="Reps"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAddDraft(
                          "reps",
                          String(Math.max(1, Number(addDraft.reps || "1") - 1)),
                        )
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-800"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAddDraft(
                          "reps",
                          String(Math.max(1, Number(addDraft.reps || "0") + 1)),
                        )
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-800"
                    >
                      +1
                    </button>
                  </div>
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onAddSet}
                  disabled={isSavingSet || isPlannedSession}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5 text-sky-700" />
                  Add set
                </button>
              </div>
            </div>
          )
        ) : null}
      </div>

      {!isPlannedSession ? (
        <div className="mt-3 hidden overflow-x-auto rounded-md border border-zinc-200 bg-white md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Set</th>
                <th className="px-2 py-2">{loadFieldLabel}</th>
                <th className="px-2 py-2">Reps</th>
                {canManageSets ? <th className="px-2 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleSets.map((set) =>
                editingSetId === set.id ? (
                  <tr key={set.id} className="border-b bg-white">
                    <td className="px-2 py-2">
                      {canEditSetAsWarmup(visibleSets, set.id) ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-zinc-800">
                          <input
                            type="checkbox"
                            checked={editDraft.isWarmup}
                            onChange={(event) =>
                              onEditDraftChange((prev) => ({ ...prev, isWarmup: event.target.checked }))
                            }
                            className="rounded border-zinc-300 text-sky-700 focus:ring-sky-600"
                          />
                          <span className="text-xs">Warmup?</span>
                        </label>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{set.set_number}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={editDraft.weightKg}
                        onChange={(event) =>
                          onEditDraftChange((prev) => ({ ...prev, weightKg: event.target.value }))
                        }
                        className="w-24 rounded-md border bg-white px-2 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        value={editDraft.reps}
                        onChange={(event) =>
                          onEditDraftChange((prev) => ({ ...prev, reps: event.target.value }))
                        }
                        className="w-20 rounded-md border bg-white px-2 py-1"
                      />
                    </td>
                    {canManageSets ? (
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveEdit(set.id)}
                            disabled={isSavingSet}
                            className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={isSavingSet}
                            className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                          >
                            <X className="h-3 w-3 text-zinc-500" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ) : (
                  <tr
                    key={set.id}
                    className="border-b odd:bg-white even:bg-zinc-50/60 hover:bg-zinc-100/60"
                  >
                    <td className="px-2 py-2">
                      <SetKindIndicator isWarmup={set.is_warmup} density="compact" />
                    </td>
                    <td className="px-2 py-2">{set.set_number}</td>
                    <td className="px-2 py-2">
                      <div>{set.weight_kg ?? "-"}</div>
                      {assistance ? (
                        <div className="text-xs text-zinc-500">
                          {set.weight_kg == null || Number(set.weight_kg) === 0
                            ? "Unassisted bodyweight"
                            : "Assistance"}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">
                          Total: {((set.weight_kg ?? 0) + (baseWeightKg ?? 0)).toFixed(1)} kg
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{set.reps}</td>
                    {canManageSets ? (
                      <td className="px-2 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onDeleteSet(set.id)}
                            disabled={isSavingSet}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => onStartEdit(set)}
                            disabled={isSavingSet}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-100"
                          >
                            <Pencil className="h-3 w-3 text-sky-700" />
                            Edit
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ),
              )}
              {canManageSets && hideFullViewAddSetRow ? (
                <tr className="border-b bg-sky-50/50">
                  <td colSpan={5} className="px-2 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-950">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
                        All target working sets logged.
                      </span>
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        title="Show the add-set row to log more sets."
                        onClick={onExpandFullAddSetRow}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Add more sets
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ) : null}
              {canManageSets && !hideFullViewAddSetRow ? (
                <tr>
                  <td className="px-2 py-2">
                    {showWarmupToggle ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-zinc-800">
                        <input
                          type="checkbox"
                          checked={addDraft.isWarmup}
                          onChange={(event) => onUpdateAddDraft("isWarmup", event.target.checked)}
                          className="rounded border-zinc-300 text-sky-700 focus:ring-sky-600"
                        />
                        <span className="text-xs">Warmup?</span>
                      </label>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                      <Plus className="h-3 w-3 text-sky-700" />
                      New
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={addDraft.weightKg}
                      onChange={(event) => onUpdateAddDraft("weightKg", event.target.value)}
                      className="w-24 rounded-md border bg-white px-2 py-1"
                      placeholder={assistance ? "Assistance" : "Weight"}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      value={addDraft.reps}
                      onChange={(event) => onUpdateAddDraft("reps", event.target.value)}
                      className="w-20 rounded-md border bg-white px-2 py-1"
                      placeholder="Reps"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={onAddSet}
                        disabled={isSavingSet || isPlannedSession}
                        className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-2 py-1 text-xs text-white hover:border-sky-600 hover:bg-sky-600"
                      >
                        <Plus className="h-3.5 w-3.5 text-white" />
                        Add set
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
