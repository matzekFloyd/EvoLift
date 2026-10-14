"use client";

import { useEffect } from "react";
import { isSelectableInputType } from "@/app/components/selectable-text-control";

function isSelectableTextControl(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) {
    return false;
  }
  return isSelectableInputType(target.type);
}

/**
 * Registers a capture-phase double-click handler so text-like fields select their full value.
 * Keeps one implementation for the whole app (no per-field wiring).
 */
export function SelectFieldValueOnDoubleClick() {
  useEffect(() => {
    const onDoubleClick = (event: MouseEvent) => {
      if (!isSelectableTextControl(event.target)) {
        return;
      }
      (event.target as HTMLInputElement | HTMLTextAreaElement).select();
    };
    document.addEventListener("dblclick", onDoubleClick, true);
    return () => document.removeEventListener("dblclick", onDoubleClick, true);
  }, []);

  return null;
}
