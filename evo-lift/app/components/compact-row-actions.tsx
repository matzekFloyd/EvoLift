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
}: CompactRowActionsProps) {
  if (isEditing) {
    return (
      <TableRowActions>
        <ActionButton type="button" size="sm" variant="secondary" onClick={onSave}>
          <Check className="h-3 w-3" aria-hidden />
          {saveLabel}
        </ActionButton>
        <ActionButton type="button" size="sm" variant="secondary" onClick={onCancel}>
          <X className="h-3 w-3" aria-hidden />
          {cancelLabel}
        </ActionButton>
      </TableRowActions>
    );
  }

  return (
    <TableRowActions>
      {showSecondary && onSecondary ? (
        <ActionButton type="button" size="sm" variant="danger" onClick={onSecondary}>
          <Trash2 className="h-3 w-3" aria-hidden />
          {secondaryLabel}
        </ActionButton>
      ) : null}
      <ActionButton type="button" size="sm" variant="secondary" onClick={onEdit}>
        <Pencil className="h-3 w-3" aria-hidden />
        {editLabel}
      </ActionButton>
    </TableRowActions>
  );
}
