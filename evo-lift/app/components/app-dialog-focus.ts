/** Selectors for elements that can receive keyboard focus inside a dialog. */
export const DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Focusable elements in document order within `root`. */
export function listDialogFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      !el.closest('[aria-hidden="true"]'),
  );
}

export type DialogFocusCycleResult =
  | { action: "none" }
  | { action: "prevent" }
  | { action: "focus"; index: number };

/**
 * Decide how Tab / Shift+Tab should move inside a dialog.
 * `activeIndex` is -1 when the active element is not in the focusable list.
 */
export function resolveDialogFocusCycle(args: {
  key: string;
  shiftKey: boolean;
  focusableCount: number;
  activeIndex: number;
}): DialogFocusCycleResult {
  if (args.key !== "Tab") {
    return { action: "none" };
  }
  if (args.focusableCount === 0) {
    return { action: "prevent" };
  }
  if (args.shiftKey && args.activeIndex <= 0) {
    return { action: "focus", index: args.focusableCount - 1 };
  }
  if (!args.shiftKey && (args.activeIndex < 0 || args.activeIndex === args.focusableCount - 1)) {
    return { action: "focus", index: 0 };
  }
  return { action: "none" };
}

export type DialogKeyAction =
  | { type: "close" }
  | { type: "ignore" }
  | { type: "trap"; cycle: DialogFocusCycleResult };

/**
 * Escape closes the dialog. Tab stays inside.
 * Pass `escapeCloses: false` when a nested control, such as an open listbox, handles Escape.
 */
export function resolveDialogKeyAction(args: {
  key: string;
  shiftKey: boolean;
  focusableCount: number;
  activeIndex: number;
  escapeCloses?: boolean;
}): DialogKeyAction {
  if (args.key === "Escape") {
    if (args.escapeCloses === false) {
      return { type: "ignore" };
    }
    return { type: "close" };
  }
  const cycle = resolveDialogFocusCycle(args);
  if (cycle.action === "none") {
    return { type: "ignore" };
  }
  return { type: "trap", cycle };
}

/** An open listbox consumes Escape to collapse itself. */
export function nestedControlHandlesEscape(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }
  return target.closest("[role='listbox']") != null;
}
