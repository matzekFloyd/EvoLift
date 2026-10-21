"use client";

import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { sessionLifecycleBadgeLabel, type SessionLifecycleStatus } from "@/lib/session-lifecycle";
import { CREATED_FROM_BADGE_CLASS, sessionLifecycleBadgeClass } from "./session-detail-model";

type SessionHeaderProps = {
  isCompactView: boolean;
  isReadOnly: boolean;
  sessionNumber: number | null;
  formattedPerformedOn: string;
  lifecycleStatus: SessionLifecycleStatus;
  createdFromLabel: string | null;
  isDeletingSession: boolean;
  isSavingSet: boolean;
  isMarkingCompleted: boolean;
  isDeleteSessionConfirmOpen: boolean;
  showUndoCompleted: boolean;
  showMarkCompleted: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onUndoCompleted: () => void | Promise<void>;
  onMarkCompleted: () => void | Promise<void>;
  onAddExercise: () => void;
};

/** Session title, lifecycle badges, and the delete / finish / reopen / add-exercise actions. */
export function SessionHeader({
  isCompactView,
  isReadOnly,
  sessionNumber,
  formattedPerformedOn,
  lifecycleStatus,
  createdFromLabel,
  isDeletingSession,
  isSavingSet,
  isMarkingCompleted,
  isDeleteSessionConfirmOpen,
  showUndoCompleted,
  showMarkCompleted,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onUndoCompleted,
  onMarkCompleted,
  onAddExercise,
}: SessionHeaderProps) {
  const lifecycleBadge = sessionLifecycleBadgeLabel(lifecycleStatus);
  const lifecycleBadgeClass = sessionLifecycleBadgeClass(lifecycleStatus);
  const createdFromBadgeClass = CREATED_FROM_BADGE_CLASS;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {isCompactView ? (
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            Workout session #{sessionNumber ?? "-"}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{formattedPerformedOn}</span>
            {lifecycleBadge ? (
              <span className={lifecycleBadgeClass}>{lifecycleBadge}</span>
            ) : null}
            {createdFromLabel ? (
              <span className={createdFromBadgeClass}>Created from: {createdFromLabel}</span>
            ) : null}
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workout session #{sessionNumber ?? "-"}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{formattedPerformedOn}</span>
            {lifecycleBadge ? (
              <span className={lifecycleBadgeClass}>{lifecycleBadge}</span>
            ) : null}
            {createdFromLabel ? (
              <span className={createdFromBadgeClass}>Created from: {createdFromLabel}</span>
            ) : null}
          </p>
        </div>
      )}
      <div
        className={`flex flex-wrap items-center gap-2 lg:justify-end ${
          isCompactView ? "w-full" : ""
        }`}
      >
        {!isReadOnly ? (
          <>
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={isDeletingSession || isSavingSet || isMarkingCompleted}
              className={`inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 ${
                isCompactView ? "h-10 flex-1 justify-center" : "w-fit"
              }`}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              {isDeletingSession ? "Deleting..." : "Delete session"}
            </button>
            {isDeleteSessionConfirmOpen ? (
              <div
                className={`flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 ${
                  isCompactView ? "w-full flex-wrap justify-center" : ""
                }`}
              >
                <span className="text-xs text-red-800">
                  Delete session #{sessionNumber ?? "?"}?
                </span>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  disabled={isDeletingSession}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-800 hover:border-red-500 hover:bg-red-100 disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  disabled={isDeletingSession}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-white disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        {showUndoCompleted ? (
          <button
            type="button"
            onClick={() => void onUndoCompleted()}
            disabled={isMarkingCompleted || isSavingSet || isDeletingSession}
            className={`inline-flex items-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 ${
              isCompactView ? "h-10 flex-1 justify-center" : "w-fit"
            }`}
          >
            <RotateCcw className="h-4 w-4 text-white" />
            {isMarkingCompleted ? "Saving..." : "Reopen session"}
          </button>
        ) : null}
        {!isReadOnly && showMarkCompleted ? (
          <button
            type="button"
            onClick={onMarkCompleted}
            disabled={isMarkingCompleted || isSavingSet || isDeletingSession}
            className={`inline-flex items-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 ${
              isCompactView ? "h-10 flex-1 justify-center" : "w-fit"
            }`}
          >
            <Check className="h-4 w-4 text-white" />
            {isMarkingCompleted ? "Saving..." : "Finish session"}
          </button>
        ) : null}
        {isCompactView && !isReadOnly ? (
          <button
            type="button"
            onClick={onAddExercise}
            className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 hover:border-sky-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Plus className="h-4 w-4 text-sky-700" />
            Add exercise
          </button>
        ) : null}
      </div>
    </div>
  );
}
