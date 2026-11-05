const SKIPPED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
]);

/**
 * Single-line fields that Enter walks. A note stays a newline, and the exercise
 * search keeps its own Enter key.
 */
export function isEnterChainField(element: {
  tagName: string;
  type?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
}): boolean {
  if (element.disabled || element.readOnly) {
    return false;
  }
  const tag = element.tagName.toUpperCase();
  if (tag === "SELECT") {
    return true;
  }
  if (tag !== "INPUT") {
    return false;
  }
  const type = (element.type ?? "text").toLowerCase();
  return !SKIPPED_INPUT_TYPES.has(type);
}

export type EnterInFieldAction =
  | { type: "ignore" }
  | { type: "next"; index: number }
  | { type: "submit" };

/** Enter moves to the next single-line field. On the last one it submits. */
export function resolveEnterInField(args: {
  key: string;
  shiftKey: boolean;
  fieldCount: number;
  activeIndex: number;
}): EnterInFieldAction {
  if (args.key !== "Enter" || args.shiftKey) {
    return { type: "ignore" };
  }
  if (args.activeIndex < 0 || args.fieldCount <= 0 || args.activeIndex >= args.fieldCount) {
    return { type: "ignore" };
  }
  if (args.activeIndex < args.fieldCount - 1) {
    return { type: "next", index: args.activeIndex + 1 };
  }
  return { type: "submit" };
}

/** Label for the Android keyboard action. The last field offers to submit. */
export function enterKeyHintForField(index: number, fieldCount: number): "next" | "go" {
  if (fieldCount <= 1 || index >= fieldCount - 1) {
    return "go";
  }
  return "next";
}
