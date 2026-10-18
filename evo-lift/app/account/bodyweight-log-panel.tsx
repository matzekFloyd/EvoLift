"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import {
  AppTable,
  AppTableActionsHeader,
  appTableHeadRowClassName,
  appTableRowClassName,
  appTableTdClassName,
  appTableThClassName,
} from "@/app/components/app-table";
import { DateInput } from "@/app/components/date-input";
import { StatusNotice } from "@/app/components/status-notice";
import { TableRowActions } from "@/app/components/table-row-actions";
import {
  bodyweightLogEntryError,
  parseBodyweightKg,
} from "@/lib/bodyweight-log";
import { formatDateOnlyForLocale } from "@/lib/date-format";

export type BodyweightLogRow = {
  id: string;
  loggedOn: string;
  bodyweightKg: number;
};

type BodyweightLogPanelProps = {
  entries: BodyweightLogRow[];
  today: string;
  onSave: (input: { id: string | null; loggedOn: string; bodyweightKg: number }) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
};

export function BodyweightLogPanel({ entries, today, onSave, onRemove }: BodyweightLogPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = [...entries].sort((left, right) => right.loggedOn.localeCompare(left.loggedOn));

  function showError(text: string) {
    setMessageTone("error");
    setMessage(text);
  }

  async function saveEntry(input: { id: string; loggedOn: string; bodyweightKg: string }) {
    const takenDates = entries
      .filter((entry) => entry.id !== input.id)
      .map((entry) => entry.loggedOn);
    const error = bodyweightLogEntryError({
      bodyweightKg: input.bodyweightKg,
      loggedOn: input.loggedOn,
      today,
      takenDates,
    });
    if (error) {
      showError(error);
      return;
    }
    const bodyweightKg = parseBodyweightKg(input.bodyweightKg);
    if (bodyweightKg == null) {
      showError("Please enter a valid bodyweight.");
      return;
    }
    setBusyId(input.id);
    setMessage(null);
    const saveError = await onSave({ id: input.id, loggedOn: input.loggedOn, bodyweightKg });
    setBusyId(null);
    if (saveError) {
      showError(saveError);
      return;
    }
    setMessageTone("success");
    setMessage("Bodyweight saved.");
    setEditingId(null);
  }

  async function removeEntry(id: string) {
    setBusyId(id);
    setMessage(null);
    const removeError = await onRemove(id);
    setBusyId(null);
    if (removeError) {
      showError(removeError);
      return;
    }
    if (editingId === id) {
      setEditingId(null);
    }
    setMessageTone("success");
    setMessage("Bodyweight removed.");
  }

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-zinc-800">Bodyweight log</h3>
        <p className="text-sm leading-snug text-zinc-600">
          Each row is the bodyweight on that date. The latest row is the current bodyweight. Saving
          body metrics writes today.
        </p>
      </div>
      {message ? (
        <StatusNotice message={message} tone={messageTone} onDismiss={() => setMessage(null)} />
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">No bodyweight entries yet.</p>
      ) : (
        <AppTable>
          <thead>
            <tr className={appTableHeadRowClassName}>
              <th className={appTableThClassName}>Date</th>
              <th className={appTableThClassName}>Bodyweight (kg)</th>
              <AppTableActionsHeader />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <tr key={row.id} className={appTableRowClassName}>
                  <td className={appTableTdClassName}>
                    {isEditing ? (
                      <DateInput
                        min="1900-01-01"
                        max={today}
                        value={editDate}
                        onChange={(event) => setEditDate(event.target.value)}
                        className="h-9 w-full rounded-md border bg-white px-2 py-1 text-sm"
                      />
                    ) : (
                      formatDateOnlyForLocale(row.loggedOn)
                    )}
                  </td>
                  <td className={appTableTdClassName}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editWeight}
                        onChange={(event) => setEditWeight(event.target.value)}
                        className="h-9 w-full rounded-md border bg-white px-2 py-1 text-sm"
                      />
                    ) : (
                      row.bodyweightKg
                    )}
                  </td>
                  <td className={appTableTdClassName}>
                    <TableRowActions>
                      {isEditing ? (
                        <>
                          <ActionButton
                            type="button"
                            size="sm"
                            disabled={busyId != null}
                            onClick={() =>
                              void saveEntry({ id: row.id, loggedOn: editDate, bodyweightKg: editWeight })
                            }
                          >
                            Save
                          </ActionButton>
                          <ActionButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busyId != null}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </ActionButton>
                        </>
                      ) : (
                        <>
                          <ActionButton
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busyId != null}
                            onClick={() => {
                              setEditingId(row.id);
                              setEditDate(row.loggedOn.slice(0, 10));
                              setEditWeight(String(row.bodyweightKg));
                              setMessage(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Change
                          </ActionButton>
                          <ActionButton
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={busyId != null}
                            onClick={() => void removeEntry(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </ActionButton>
                        </>
                      )}
                    </TableRowActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AppTable>
      )}
    </div>
  );
}
