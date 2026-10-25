/** Visible name for the header log-out control, on desktop and in the compact menu. */
export const HEADER_LOG_OUT_LABEL = "Log out";

/**
 * Tailwind `lg` (64rem). The labeled nav row and the compact menu meet here.
 * Keep the `lg:` classes in the header on this same width.
 */
export const DESKTOP_NAV_MEDIA_QUERY = "(min-width: 64rem)";

/** Icon-only compact control. The name changes with open state so it matches the icon. */
export function compactMenuButtonLabel(isOpen: boolean): string {
  return isOpen ? "Close navigation menu" : "Open navigation menu";
}

/** Menu button on the sky header. Zinc-900 so the icon reads on the wash. */
export const compactMenuButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-900 hover:bg-white/70 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-100";

/** Lucide size for the desktop row and the menu button. */
export const headerNavGlyphClassName = "h-4 w-4 shrink-0";

/** Larger glyph for a compact-menu tile, where the icon sits above the label. */
export const headerNavTileGlyphClassName = "h-6 w-6 shrink-0";

/**
 * Desktop nav item, drawn on the sky header.
 * Words are zinc-900 or sky-950 so they stay dark on the wash.
 * Hover is the same soft white wash on every item. The current page keeps its underline, so the wash does not replace that mark.
 */
export function headerNavItemClassName(isActive: boolean): string {
  return [
    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-1.5 text-sm font-medium leading-none",
    "transition-colors duration-150 motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-100",
    "hover:bg-white/60",
    isActive
      ? "text-sky-950 underline decoration-2 underline-offset-4 decoration-sky-700 hover:!text-sky-950"
      : "text-zinc-900 hover:!text-zinc-900",
  ].join(" ");
}

/**
 * Compact-menu tile. White ground so the label reads. The current page is a filled sky tile
 * with white text: the menu covers the page, so this is the one strong mark.
 */
export function headerNavTileClassName(isActive: boolean): string {
  return [
    "flex min-h-[5.75rem] w-full flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 text-center text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "transition-colors duration-150 motion-reduce:transition-none",
    isActive
      ? "border-sky-700 bg-sky-700 text-white hover:border-sky-600 hover:bg-sky-600 hover:!text-white focus-visible:ring-white focus-visible:ring-offset-sky-700"
      : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-300 hover:bg-sky-50 hover:!text-zinc-800 focus-visible:ring-sky-700",
  ].join(" ");
}

/** Left rule before Log out in the desktop row. The menu keeps Log out as a tile. */
export function headerLogOutGroupClassName(): string {
  return "flex items-center border-s border-zinc-400 ps-2";
}

/** A wide window shows the nav row, so the compact menu should close. */
export function compactMenuShouldClose(matchesDesktopNav: boolean): boolean {
  return matchesDesktopNav;
}

/**
 * Tab order while the compact menu is open: wordmark, menu button, then dialog links.
 * The wordmark and button sit above the overlay, so they stay in the cycle with the links.
 */
export function compactMenuFocusable(args: {
  logo: HTMLElement | null;
  trigger: HTMLElement | null;
  dialogItems: readonly HTMLElement[];
}): HTMLElement[] {
  return [args.logo, args.trigger, ...args.dialogItems].filter((el): el is HTMLElement => el != null);
}

/**
 * Keyboard activation of the menu button reports click detail 0 and should show the ring
 * on the first item. A tap or click reports a positive detail and should move focus without it.
 */
export function compactMenuInitialFocusVisible(clickDetail: number): boolean {
  return clickDetail === 0;
}

/**
 * Move focus. Programmatic focus skips `:focus-visible` unless `focusVisible` is true.
 * The compact menu forces the ring for keyboard focus and skips it after a tap.
 */
export function focusHeaderControl(
  element: HTMLElement | null,
  options?: { focusVisible?: boolean },
) {
  element?.focus({ focusVisible: options?.focusVisible ?? true });
}
