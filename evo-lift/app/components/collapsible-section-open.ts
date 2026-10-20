export function initialCollapsibleSectionOpen(input: {
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
}): boolean {
  if (input.alwaysOpen) {
    return true;
  }
  return input.defaultOpen === true;
}

export function collapsibleSectionCanToggle(alwaysOpen: boolean): boolean {
  return !alwaysOpen;
}

/**
 * Closed sections leave their body unmounted. Insights charts sit in those
 * bodies, and Recharts reads layout as soon as a chart mounts.
 */
export function shouldRenderCollapsibleBody(isOpen: boolean): boolean {
  return isOpen;
}
