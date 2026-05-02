"use client";

import { useEffect } from "react";

/** Input types where double-click should not select (secrets or non-text interaction). */
const NON_SELECT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "password",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isSelectableTextControl(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) {
    return false;
  }
  return !NON_SELECT_INPUT_TYPES.has(target.type);
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
