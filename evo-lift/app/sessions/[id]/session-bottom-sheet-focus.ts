/** Selectors for elements that can receive keyboard focus inside a sheet. */
export const SESSION_SHEET_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Focusable elements in document order within `root`. */
export function listSessionSheetFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(SESSION_SHEET_FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      !el.closest('[aria-hidden="true"]'),
  );
}

export type SessionSheetFocusCycleResult =
  | { action: "none" }
  | { action: "prevent" }
  | { action: "focus"; index: number };

/**
 * Decide how Tab / Shift+Tab should move inside a sheet.
 * `activeIndex` is -1 when the active element is not in the focusable list.
 */
export function resolveSessionSheetFocusCycle(args: {
  key: string;
  shiftKey: boolean;
  focusableCount: number;
  activeIndex: number;
}): SessionSheetFocusCycleResult {
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

/**
 * Keep Tab / Shift+Tab inside the sheet. Returns true when the event was handled.
 */
export function cycleSessionSheetFocus(
  root: HTMLElement,
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">,
  activeElement: Element | null,
): boolean {
  const focusable = listSessionSheetFocusable(root);
  const activeIndex =
    activeElement instanceof HTMLElement ? focusable.indexOf(activeElement) : -1;
  const result = resolveSessionSheetFocusCycle({
    key: event.key,
    shiftKey: event.shiftKey,
    focusableCount: focusable.length,
    activeIndex,
  });

  if (result.action === "none") {
    return false;
  }
  event.preventDefault();
  if (result.action === "focus") {
    focusable[result.index]?.focus();
  }
  return true;
}
