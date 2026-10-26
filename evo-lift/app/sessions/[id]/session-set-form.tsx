"use client";

import { Plus } from "lucide-react";
import { type Dispatch, type SetStateAction, useLayoutEffect, useRef, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { Checkbox } from "@/app/components/checkbox";
import { TextField } from "@/app/components/text-field";
import { CompactRowActions } from "@/app/components/compact-row-actions";
import { TableRowActions } from "@/app/components/table-row-actions";
import { PanelInset } from "@/app/components/panel-inset";
import { addSetComposerVisible, type SessionLogPrimary } from "./session-log-primary";
import {
  externalLoadFieldLabel,
  externalLoadValuePrefix,
  isAssistanceExercise,
} from "@/lib/assistance-exercise";
import { setsToShowForSkippedExercise } from "./session-exercise-status";
import { SetKindIndicator } from "@/app/components/set-kind-indicator";
import { shouldShowSetSummarySeparator } from "./compact-set-summary";
import {
  lastSessionComparisonLine,
  nextWorkingSetOrdinal,
  workingSetOrdinal,
  type LastSessionWorkingSet,
} from "./last-session-set-comparison";
import { canEditSetAsWarmup, showWarmupSetToggle, type SessionSetDraft } from "./session-set-draft";
import type { WorkoutSetRow } from "./session-detail-actions";

function SetStepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs tabular-nums text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}

function LastSessionSetNote({ line }: { line: string | null }) {
  if (!line) {
    return null;
  }
  return <p className="mt-1 text-xs tabular-nums text-zinc-600">{line}</p>;
}

function loggedSetComparisonLine(
  sets: WorkoutSetRow[],
  setId: string,
  setNumber: number,
  isWarmup: boolean,
  previousWorkingSets: readonly LastSessionWorkingSet[],
  assistance: boolean,
  labeled: boolean,
): string | null {
  if (isWarmup) {
    return null;
  }
  const ordinal = workingSetOrdinal(
    sets.map((row) => ({
      setNumber: row.set_number,
      isWarmup: row.id === setId ? isWarmup : row.is_warmup,
    })),
    setNumber,
  );
  return lastSessionComparisonLine(previousWorkingSets, ordinal, { assistance, labeled });
}

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
        <span ref={loadRef} className="tabular-nums">
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
  /** Which control on this exercise is the filled action. */
  logPrimary: SessionLogPrimary;
  onShowExtraSets: () => void;
  onExpandFullAddSetRow: () => void;
  /** Working sets from the previous session, in log order. Warmups are already omitted. */
  previousWorkingSets?: readonly LastSessionWorkingSet[];
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
  logPrimary,
  onShowExtraSets,
  onExpandFullAddSetRow,
  previousWorkingSets = [],
}: SessionExerciseSetsProps) {
  const visibleSets = setsToShowForSkippedExercise(sets, notDone);
  const showWarmupToggle = showWarmupSetToggle(lastSet?.is_warmup ?? null);
  const loadFieldLabel = externalLoadFieldLabel(exerciseSlug);
  const loadValuePrefix = externalLoadValuePrefix(exerciseSlug);
  const assistance = isAssistanceExercise(exerciseSlug);
  const composers = addSetComposerVisible({
    canManageSets,
    targetsMet: targetSetsMet,
    singleExerciseFlow: shouldUseSingleExerciseFlow,
    showExtraSetComposer: compactShowExtraSetComposer,
    addRowExpanded: fullAddSetRowExpanded,
  });
  const hideCompactNewSetComposer = !composers.compact;
  const hideFullViewAddSetRow = !composers.desktop;
  const addSetPrimary = logPrimary === "add-set";
  const saveSetPrimary = logPrimary === "save-set";
  const setColumnCount = canManageSets ? 6 : 5;
  const upcomingWorkingOrdinal = addDraft.isWarmup
    ? null
    : nextWorkingSetOrdinal(sets.map((set) => ({ isWarmup: set.is_warmup })));
  const comparisonFor = (set: WorkoutSetRow, isWarmup: boolean, labeled: boolean) =>
    loggedSetComparisonLine(
      sets,
      set.id,
      set.set_number,
      isWarmup,
      previousWorkingSets,
      assistance,
      labeled,
    );

  return (
    <>
      <div className="mt-3 space-y-3 md:hidden">
        {visibleSets.map((set, setIndex) =>
          editingSetId === set.id ? (
            <PanelInset
              key={set.id}
              data-compact-set-row=""
              data-compact-last-set={setIndex === visibleSets.length - 1 ? "" : undefined}
              className="p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="shrink-0 text-sm font-medium text-zinc-900">Set {set.set_number}</p>
                  <LastSessionSetNote line={comparisonFor(set, editDraft.isWarmup, true)} />
                </div>
                {canEditSetAsWarmup(visibleSets, set.id) ? (
                  <Checkbox
                    checked={editDraft.isWarmup}
                    onChange={(isWarmup) => onEditDraftChange((prev) => ({ ...prev, isWarmup }))}
                    className="shrink-0 whitespace-nowrap"
                  >
                    Warmup?
                  </Checkbox>
                ) : null}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-zinc-600">
                  {loadFieldLabel}
                  <TextField
                    size="compact"
                    type="number"
                    min={0}
                    step="0.25"
                    value={editDraft.weightKg}
                    onChange={(event) =>
                      onEditDraftChange((prev) => ({ ...prev, weightKg: event.target.value }))
                    }
                    className="mt-1 w-full"
                  />
                </label>
                <label className="text-xs font-medium text-zinc-600">
                  Reps
                  <TextField
                    size="compact"
                    type="number"
                    min={1}
                    value={editDraft.reps}
                    onChange={(event) =>
                      onEditDraftChange((prev) => ({ ...prev, reps: event.target.value }))
                    }
                    className="mt-1 w-full"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <CompactRowActions
                  isEditing
                  disabled={isSavingSet}
                  savePrimary={saveSetPrimary}
                  onEdit={() => {}}
                  onSave={() => onSaveEdit(set.id)}
                  onCancel={onCancelEdit}
                />
              </div>
            </PanelInset>
          ) : (
            <PanelInset
              key={set.id}
              data-compact-set-row=""
              data-compact-last-set={setIndex === visibleSets.length - 1 ? "" : undefined}
              className="p-3"
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
                    <LastSessionSetNote line={comparisonFor(set, set.is_warmup, true)} />
                  </div>
                  {canManageSets ? (
                    <div className="flex shrink-0 items-center">
                      <CompactRowActions
                        beside
                        isEditing={false}
                        disabled={isSavingSet}
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
                  <p className="mt-1 text-sm tabular-nums">
                    <span className="font-medium">{loadValuePrefix}:</span> {set.weight_kg ?? "-"} kg
                  </p>
                  <p className="text-sm tabular-nums">
                    <span className="font-medium">Reps:</span> {set.reps}
                  </p>
                  <LastSessionSetNote line={comparisonFor(set, set.is_warmup, true)} />
                  {assistance ? (
                    <p className="text-xs text-zinc-600">
                      {set.weight_kg == null || Number(set.weight_kg) === 0
                        ? "Unassisted bodyweight."
                        : "Assistance, not added load."}
                    </p>
                  ) : (
                    <p className="text-xs tabular-nums text-zinc-600">
                      Total: {((set.weight_kg ?? 0) + (baseWeightKg ?? 0)).toFixed(1)} kg
                    </p>
                  )}
                  {canManageSets ? (
                    <div className="mt-3 flex justify-end">
                      <CompactRowActions
                        isEditing={false}
                        disabled={isSavingSet}
                        onEdit={() => onStartEdit(set)}
                        onSave={() => {}}
                        onCancel={() => {}}
                        onSecondary={() => onDeleteSet(set.id)}
                        secondaryLabel="Delete"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </PanelInset>
          ),
        )}
        {canManageSets ? (
          hideCompactNewSetComposer ? (
            <PanelInset data-compact-next-action="" className="p-3">
              <p className="text-sm font-medium text-zinc-900">All target working sets logged.</p>
              {exerciseIndex >= exerciseCount - 1 ? (
                <p className="mt-1 text-xs text-zinc-600">
                  Last exercise in this session. Add another exercise when you are ready, or finish
                  logging.
                </p>
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
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Add more sets
              </ActionButton>
            </PanelInset>
          ) : (
            <PanelInset
              tone="accent"
              id={`compact-new-set-panel-${sessionExerciseId}`}
              data-compact-next-action=""
              className="p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sky-950">New set</p>
                  <LastSessionSetNote
                    line={lastSessionComparisonLine(previousWorkingSets, upcomingWorkingOrdinal, {
                      assistance,
                      labeled: true,
                    })}
                  />
                </div>
                {showWarmupToggle ? (
                  <Checkbox
                    checked={addDraft.isWarmup}
                    onChange={(isWarmup) => onUpdateAddDraft("isWarmup", isWarmup)}
                    className="shrink-0 whitespace-nowrap"
                  >
                    Warmup?
                  </Checkbox>
                ) : (
                  <SetKindIndicator isWarmup={false} density="compact" />
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-sm font-medium text-zinc-700">
                  {loadFieldLabel}
                  <TextField
                    size="compact"
                    type="number"
                    min={0}
                    step="0.25"
                    value={addDraft.weightKg}
                    onChange={(event) => onUpdateAddDraft("weightKg", event.target.value)}
                    className="mt-1 w-full"
                    placeholder={assistance ? "Assistance" : "Weight"}
                  />
                  <div className="mt-1 flex gap-1">
                    <SetStepButton
                      label={`Decrease ${loadFieldLabel} by 2.5`}
                      onClick={() =>
                        onUpdateAddDraft(
                          "weightKg",
                          String(
                            Math.max(0, Number((Number(addDraft.weightKg || "0") - 2.5).toFixed(1))),
                          ),
                        )
                      }
                    >
                      -2.5
                    </SetStepButton>
                    <SetStepButton
                      label={`Increase ${loadFieldLabel} by 2.5`}
                      onClick={() =>
                        onUpdateAddDraft(
                          "weightKg",
                          String(Number((Number(addDraft.weightKg || "0") + 2.5).toFixed(1))),
                        )
                      }
                    >
                      +2.5
                    </SetStepButton>
                  </div>
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Reps
                  <TextField
                    size="compact"
                    type="number"
                    min={1}
                    value={addDraft.reps}
                    onChange={(event) => onUpdateAddDraft("reps", event.target.value)}
                    className="mt-1 w-full"
                    placeholder="Reps"
                  />
                  <div className="mt-1 flex gap-1">
                    <SetStepButton
                      label="Decrease reps by 1"
                      onClick={() =>
                        onUpdateAddDraft(
                          "reps",
                          String(Math.max(1, Number(addDraft.reps || "1") - 1)),
                        )
                      }
                    >
                      -1
                    </SetStepButton>
                    <SetStepButton
                      label="Increase reps by 1"
                      onClick={() =>
                        onUpdateAddDraft(
                          "reps",
                          String(Math.max(1, Number(addDraft.reps || "0") + 1)),
                        )
                      }
                    >
                      +1
                    </SetStepButton>
                  </div>
                </label>
              </div>
              <ActionButton
                type="button"
                variant={addSetPrimary ? "primary" : "secondary"}
                fullWidth
                className="mt-3 !h-11"
                disabled={isSavingSet || isPlannedSession}
                onClick={onAddSet}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                Add set
              </ActionButton>
            </PanelInset>
          )
        ) : null}
      </div>

      {!isPlannedSession ? (
        <div className="mt-3 hidden overflow-x-auto rounded-md border border-zinc-200 bg-white md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Set</th>
                <th className="px-2 py-2">{loadFieldLabel}</th>
                <th className="px-2 py-2">Reps</th>
                <th className="px-2 py-2">Last session</th>
                {canManageSets ? <th className="px-2 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleSets.map((set) =>
                editingSetId === set.id ? (
                  <tr key={set.id} className="border-b bg-white">
                    <td className="px-2 py-2">
                      {canEditSetAsWarmup(visibleSets, set.id) ? (
                        <Checkbox
                          checked={editDraft.isWarmup}
                          onChange={(isWarmup) =>
                            onEditDraftChange((prev) => ({ ...prev, isWarmup }))
                          }
                          className="whitespace-nowrap"
                        >
                          Warmup?
                        </Checkbox>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{set.set_number}</td>
                    <td className="px-2 py-2">
                      <TextField
                        size="compact"
                        type="number"
                        min={0}
                        step="0.25"
                        value={editDraft.weightKg}
                        onChange={(event) =>
                          onEditDraftChange((prev) => ({ ...prev, weightKg: event.target.value }))
                        }
                        aria-label={loadFieldLabel}
                        className="w-24"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <TextField
                        size="compact"
                        type="number"
                        min={1}
                        value={editDraft.reps}
                        onChange={(event) =>
                          onEditDraftChange((prev) => ({ ...prev, reps: event.target.value }))
                        }
                        aria-label="Reps"
                        className="w-20"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs tabular-nums text-zinc-600">
                      {comparisonFor(set, editDraft.isWarmup, false)}
                    </td>
                    {canManageSets ? (
                      <td className="px-2 py-2">
                        <CompactRowActions
                          isEditing
                          disabled={isSavingSet}
                          savePrimary={saveSetPrimary}
                          onEdit={() => {}}
                          onSave={() => onSaveEdit(set.id)}
                          onCancel={onCancelEdit}
                        />
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
                    <td className="px-2 py-2 tabular-nums">{set.set_number}</td>
                    <td className="px-2 py-2 tabular-nums">
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
                    <td className="px-2 py-2 tabular-nums">{set.reps}</td>
                    <td className="px-2 py-2 text-xs tabular-nums text-zinc-600">
                      {comparisonFor(set, set.is_warmup, false)}
                    </td>
                    {canManageSets ? (
                      <td className="px-2 py-2">
                        <CompactRowActions
                          isEditing={false}
                          disabled={isSavingSet}
                          onEdit={() => onStartEdit(set)}
                          onSave={() => {}}
                          onCancel={() => {}}
                          onSecondary={() => onDeleteSet(set.id)}
                          secondaryLabel="Delete"
                        />
                      </td>
                    ) : null}
                  </tr>
                ),
              )}
              {canManageSets && hideFullViewAddSetRow ? (
                <tr className="border-b bg-zinc-50">
                  <td colSpan={setColumnCount} className="px-2 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-zinc-900">
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
                      <Checkbox
                        checked={addDraft.isWarmup}
                        onChange={(isWarmup) => onUpdateAddDraft("isWarmup", isWarmup)}
                        className="whitespace-nowrap"
                      >
                        Warmup?
                      </Checkbox>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-xs text-zinc-600">New</span>
                  </td>
                  <td className="px-2 py-2">
                    <TextField
                      size="compact"
                      type="number"
                      min={0}
                      step="0.25"
                      value={addDraft.weightKg}
                      onChange={(event) => onUpdateAddDraft("weightKg", event.target.value)}
                      aria-label={loadFieldLabel}
                      className="w-24"
                      placeholder={assistance ? "Assistance" : "Weight"}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextField
                      size="compact"
                      type="number"
                      min={1}
                      value={addDraft.reps}
                      onChange={(event) => onUpdateAddDraft("reps", event.target.value)}
                      aria-label="Reps"
                      className="w-20"
                      placeholder="Reps"
                    />
                  </td>
                  <td className="px-2 py-2 text-xs tabular-nums text-zinc-600">
                    {lastSessionComparisonLine(previousWorkingSets, upcomingWorkingOrdinal, {
                      assistance,
                      labeled: false,
                    })}
                  </td>
                  <td className="px-2 py-2">
                    <TableRowActions>
                      <ActionButton
                        type="button"
                        size="sm"
                        variant={addSetPrimary ? "primary" : "secondary"}
                        disabled={isSavingSet || isPlannedSession}
                        onClick={onAddSet}
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Add set
                      </ActionButton>
                    </TableRowActions>
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
