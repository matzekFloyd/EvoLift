"use client";

import { CalendarDays, Check, Pencil } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { DateInput } from "@/app/components/date-input";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { panelInsetClass } from "@/app/components/panel-inset";
import { StatusNotice } from "@/app/components/status-notice";
import { maxSessionNotesLength } from "./session-detail-model";

type SessionDetailsPanelProps = {
  isReadOnly: boolean;
  isCompactView: boolean;
  isEditing: boolean;
  /** Saved session notes (view mode). */
  notes: string | null;
  formattedPerformedOn: string;
  performedOnDraft: string;
  notesDraft: string;
  dateError: string | null;
  notesError: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isDeletingSession: boolean;
  onBeginEdit: () => void;
  onPerformedOnChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
};

/** Session notes and performed-on date: read-only summary, compact row, or the edit form. */
export function SessionDetailsPanel({
  isReadOnly,
  isCompactView,
  isEditing,
  notes,
  formattedPerformedOn,
  performedOnDraft,
  notesDraft,
  dateError,
  notesError,
  isDirty,
  isSaving,
  isDeletingSession,
  onBeginEdit,
  onPerformedOnChange,
  onNotesChange,
  onSave,
  onCancel,
}: SessionDetailsPanelProps) {
  return (
    <>
      {isReadOnly && notes?.trim() ? (
        <p className={panelInsetClass(isCompactView ? "line-clamp-2 px-3 py-2" : "p-3")}>
          <span className="font-medium">Notes:</span> {notes}
        </p>
      ) : null}
      {!isReadOnly && isCompactView && !isEditing ? (
        <div className={panelInsetClass("mt-2 flex items-center gap-2 px-3 py-2")}>
          <p className="min-w-0 flex-1 truncate text-sm text-zinc-800" title={notes?.trim() || undefined}>
            <span className="font-medium text-zinc-700">Notes: </span>
            {notes?.trim() ? notes.trim() : <span className="text-zinc-500">None</span>}
          </p>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            raised
            onClick={onBeginEdit}
            disabled={isSaving || isDeletingSession}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </ActionButton>
        </div>
      ) : null}
      {!isReadOnly && (!isCompactView || isEditing) ? (
        <div
          className={panelInsetClass(
            isCompactView ? "mt-2 space-y-2 p-3" : "mt-3 space-y-3 p-4",
          )}
        >
          {!isEditing ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-700">Performed on</p>
                  <p className="mt-0.5 tabular-nums text-zinc-900">{formattedPerformedOn}</p>
                </div>
                <div className="flex shrink-0 justify-end">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    raised
                    onClick={onBeginEdit}
                    disabled={isSaving || isDeletingSession}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </ActionButton>
                </div>
              </div>
              <div className="text-sm">
                <p className="font-medium text-zinc-700">Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap text-zinc-900">
                  {notes?.trim() ? notes : <span className="text-zinc-500">None</span>}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="session-performed-on-edit"
                    className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-zinc-800"
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                    Performed on
                  </label>
                  <DateInput
                    id="session-performed-on-edit"
                    value={performedOnDraft}
                    onChange={(event) => onPerformedOnChange(event.target.value)}
                    className="block w-full max-w-[11rem] md:max-w-xs"
                  />
                  {dateError ? (
                    <StatusNotice message={dateError} tone="error" className="mt-1" />
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 self-end md:flex-row md:justify-end md:self-start">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    raised
                    onClick={onCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => void onSave()}
                    disabled={!isDirty || isSaving || isDeletingSession}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {isSaving ? "Saving..." : "Save"}
                  </ActionButton>
                </div>
              </div>
              <div>
                <NotesTextareaField
                  label="Session notes (optional)"
                  value={notesDraft}
                  onChange={onNotesChange}
                  placeholder="Optional notes for this workout"
                  maxLength={maxSessionNotesLength}
                  heightClassName={isCompactView ? "h-16" : "h-28"}
                />
                {notesError ? (
                  <StatusNotice message={notesError} tone="error" className="mt-1" />
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
