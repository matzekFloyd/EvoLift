/**
 * How far a fixed `bottom: 0` surface must move up so it stays above the keyboard.
 *
 * `innerHeight` is the layout viewport. `visualHeight` and `visualOffsetTop` are the
 * visible viewport. Their gap is the keyboard when the layout viewport does not shrink.
 * A short gap is browser chrome, not a keyboard, and must not lift the sheet.
 */
const KEYBOARD_OVERLAP_MIN_PX = 80;

export function keyboardOverlapPx(input: {
  innerHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
}): number {
  const { innerHeight, visualHeight, visualOffsetTop } = input;
  if (![innerHeight, visualHeight, visualOffsetTop].every((value) => Number.isFinite(value))) {
    return 0;
  }
  const overlap = Math.round(innerHeight - visualHeight - visualOffsetTop);
  if (overlap < KEYBOARD_OVERLAP_MIN_PX) {
    return 0;
  }
  return overlap;
}

/**
 * iOS already pins `position: fixed` to the visual viewport, so an extra offset
 * would lift the sheet twice. iPadOS reports a Mac user agent with a touch screen.
 */
export function isIosPlatform(input: { userAgent: string; maxTouchPoints: number }): boolean {
  if (/iPad|iPhone|iPod/.test(input.userAgent)) {
    return true;
  }
  return input.userAgent.includes("Mac") && input.maxTouchPoints > 1;
}

/** Overlap published for Android and desktop. iOS stays at 0. */
export function publishedKeyboardOverlapPx(input: {
  innerHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  userAgent: string;
  maxTouchPoints: number;
}): number {
  if (isIosPlatform(input)) {
    return 0;
  }
  return keyboardOverlapPx(input);
}

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** True for a field that opens the on-screen keyboard or a text picker. */
export function isKeyboardTextEntry(element: { tagName: string; type?: string | null }): boolean {
  const tag = element.tagName.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (tag !== "INPUT") {
    return false;
  }
  const type = (element.type ?? "text").toLowerCase();
  return !NON_TEXT_INPUT_TYPES.has(type);
}

/**
 * Scroll delta that centers a field in a scroller. 0 when the field already
 * sits inside the margin, so an open keyboard does not jump a visible field.
 */
export function scrollDeltaToRevealField(input: {
  scrollTop: number;
  containerHeight: number;
  fieldOffsetTop: number;
  fieldHeight: number;
  margin: number;
}): number {
  const { scrollTop, containerHeight, fieldOffsetTop, fieldHeight, margin } = input;
  if (
    ![scrollTop, containerHeight, fieldOffsetTop, fieldHeight, margin].every((value) =>
      Number.isFinite(value),
    ) ||
    containerHeight <= 0 ||
    fieldHeight < 0 ||
    margin < 0
  ) {
    return 0;
  }

  const fieldTopInView = fieldOffsetTop - scrollTop;
  const fieldBottomInView = fieldTopInView + fieldHeight;
  const topLimit = margin;
  const bottomLimit = Math.max(topLimit, containerHeight - margin);
  if (fieldTopInView >= topLimit && fieldBottomInView <= bottomLimit) {
    return 0;
  }

  const centeredScrollTop = fieldOffsetTop - (containerHeight - fieldHeight) / 2;
  return centeredScrollTop - scrollTop;
}

/** Fixed sheet sits this far above the layout bottom. */
export const keyboardOverlapBottom = "var(--keyboard-overlap, 0px)";

/**
 * 85vh while the keyboard is closed. Once the keyboard covers the lower screen,
 * the cap is the visible height so the sheet cannot extend behind it.
 */
export const keyboardAwareMaxHeight = "min(85vh, var(--visual-viewport-height, 85vh))";

/** Dialog overlay padding that keeps a centered panel above the keyboard. */
export const dialogKeyboardPaddingBottom = "max(0.75rem, var(--keyboard-overlap, 0px))";
