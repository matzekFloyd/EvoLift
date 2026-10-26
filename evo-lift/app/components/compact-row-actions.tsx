"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { ActionButton } from "@/app/components/action-button";
import { TableRowActions } from "@/app/components/table-row-actions";

type CompactRowActionsProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
  showSecondary?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  /** Save is the filled action of this row. Otherwise it stays zinc. */
  savePrimary?: boolean;
  /** One short row beside the set. The default stacks Delete over Edit on a phone. */
  beside?: boolean;
};

export function CompactRowActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onSecondary,
  secondaryLabel = "Delete",
  showSecondary = true,
  editLabel = "Edit",
  saveLabel = "Save",
  cancelLabel = "Cancel",
  disabled = false,
  savePrimary = false,
  beside = false,
}: CompactRowActionsProps) {
  if (beside && !isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        {showSecondary && onSecondary ? (
          <ActionButton
            type="button"
            size="sm"
            variant="danger"
            disabled={disabled}
            onClick={onSecondary}
            className="!h-8 !w-auto px-2"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {secondaryLabel}
          </ActionButton>
        ) : null}
        <ActionButton
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={onEdit}
          className="!h-8 !w-auto px-2"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {editLabel}
        </ActionButton>
      </div>
    );
  }

  if (isEditing) {
    return (
      <TableRowActions>
        <ActionButton
          type="button"
          size="sm"
          variant={savePrimary ? "primary" : "secondary"}
          disabled={disabled}
          onClick={onSave}
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          {saveLabel}
        </ActionButton>
        <ActionButton type="button" size="sm" variant="secondary" disabled={disabled} onClick={onCancel}>
          <X className="h-3.5 w-3.5" aria-hidden />
          {cancelLabel}
        </ActionButton>
      </TableRowActions>
    );
  }

  return (
    <TableRowActions>
      {showSecondary && onSecondary ? (
        <ActionButton type="button" size="sm" variant="danger" disabled={disabled} onClick={onSecondary}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {secondaryLabel}
        </ActionButton>
      ) : null}
      <ActionButton type="button" size="sm" variant="secondary" disabled={disabled} onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {editLabel}
      </ActionButton>
    </TableRowActions>
  );
}
