"use client";

import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { SectionHeading } from "@/app/components/section-heading";
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
  /** Compact logging keeps Finish in the sticky bar. The header shows it when that bar is absent. */
  showHeaderFinish: boolean;
  /** Filled only when no set on screen still owns the log. */
  finishPrimary: boolean;
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
  showHeaderFinish,
  finishPrimary,
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
  const busy = isDeletingSession || isSavingSet || isMarkingCompleted;

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
          <ActionButton
            type="button"
            variant="danger"
            onClick={onRequestDelete}
            disabled={busy}
            size={isCompactView ? "sm" : "md"}
            className={isCompactView ? "!h-9 !w-auto shrink-0" : ""}
          >
            <Trash2 className={isCompactView ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
            {isDeletingSession ? "Deleting..." : "Delete session"}
          </ActionButton>
        ) : null}
        {showUndoCompleted ? (
          <ActionButton
            type="button"
            variant="primary"
            onClick={() => void onUndoCompleted()}
            disabled={busy}
            className={isCompactView ? "!h-10 !w-auto min-w-0 flex-1" : ""}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {isMarkingCompleted ? "Saving..." : "Reopen session"}
          </ActionButton>
        ) : null}
        {!isReadOnly && showMarkCompleted && showHeaderFinish ? (
          <ActionButton
            type="button"
            variant={finishPrimary ? "primary" : "secondary"}
            onClick={() => void onMarkCompleted()}
            disabled={busy}
            className={isCompactView ? "!h-10 !w-auto min-w-0 flex-1" : ""}
          >
            <Check className="h-4 w-4" aria-hidden />
            {isMarkingCompleted ? "Saving..." : "Finish session"}
          </ActionButton>
        ) : null}
        {isCompactView && !isReadOnly ? (
          <ActionButton
            type="button"
            variant="secondary"
            iconColor="sky"
            onClick={onAddExercise}
            className="!h-10 !w-auto min-w-0 flex-1"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add exercise
          </ActionButton>
        ) : null}
      </div>
      {isDeleteSessionConfirmOpen ? (
        <AppDialog titleId="delete-session-title" panelClassName="max-w-sm" onClose={onCancelDelete}>
          <SectionHeading id="delete-session-title">
            Delete session #{sessionNumber ?? "?"}?
          </SectionHeading>
          <p className="mt-1 text-sm text-zinc-600">
            This removes the session and its logged sets. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <ActionButton type="button" variant="secondary" disabled={isDeletingSession} onClick={onCancelDelete}>
              Cancel
            </ActionButton>
            <ActionButton type="button" variant="danger" disabled={isDeletingSession} onClick={onConfirmDelete}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {isDeletingSession ? "Deleting..." : "Delete"}
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </div>
  );
}
