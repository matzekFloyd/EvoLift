"use client";

import { CalendarDays, Check, Pencil, X } from "lucide-react";
import { DateInput } from "@/app/components/date-input";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { panelInsetClass } from "@/app/components/panel-inset";
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
            <span className="font-medium text-zinc-700">Notes</span>
            <span className="text-zinc-400"> · </span>
            {notes?.trim() ? notes.trim() : <span className="text-zinc-500">None</span>}
          </p>
          <button
            type="button"
            onClick={onBeginEdit}
            disabled={isSaving || isDeletingSession}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
          >
            <Pencil className="h-3 w-3 text-sky-700" aria-hidden />
            Edit
          </button>
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
                  <button
                    type="button"
                    onClick={onBeginEdit}
                    disabled={isSaving || isDeletingSession}
                    className="inline-flex h-8 w-[72px] items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60 sm:w-20"
                  >
                    <Pencil className="h-3 w-3 text-sky-700" aria-hidden />
                    Edit
                  </button>
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
                    className="block w-full max-w-[11rem] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm md:max-w-xs"
                  />
                  {dateError ? (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {dateError}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 self-end md:flex-row md:justify-end md:self-start">
                  <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={!isDirty || isSaving || isDeletingSession}
                    className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="inline-flex w-24 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    <X className="h-3 w-3 text-zinc-500" aria-hidden />
                    Cancel
                  </button>
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
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {notesError}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
