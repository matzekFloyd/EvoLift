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
