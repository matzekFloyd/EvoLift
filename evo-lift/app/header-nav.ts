/** Visible name for the header log-out control, on desktop and in the compact menu. */
export const HEADER_LOG_OUT_LABEL = "Log out";

/** Icon-only compact control. The name changes with open state so it matches the icon. */
export function compactMenuButtonLabel(isOpen: boolean): string {
  return isOpen ? "Close navigation menu" : "Open navigation menu";
}

/** Menu button on the sky header. The ring uses the same sky offset as the wordmark. */
export const compactMenuButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-700 hover:bg-sky-100/70 hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-100";

/**
 * Compact destination tile. Current page uses a white ring on the sky fill.
 * Other tiles use a sky ring on white, so the cue is not the fill color alone.
 */
export function compactNavTileClassName(isActive: boolean): string {
  return [
    "flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 text-center text-sm font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isActive
      ? "border-sky-700 bg-sky-700 text-white shadow-sm focus-visible:ring-white focus-visible:ring-offset-sky-700"
      : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-200 hover:bg-white focus-visible:ring-sky-700",
  ].join(" ");
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

/** Move focus and keep the ring visible. Programmatic focus would otherwise skip `:focus-visible`. */
export function focusHeaderControl(element: HTMLElement | null) {
  element?.focus({ focusVisible: true });
}
