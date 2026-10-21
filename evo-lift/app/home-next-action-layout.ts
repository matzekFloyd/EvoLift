/** Session list under Past workouts starts open on desktop, collapsed on compact. */
export function homeSessionTableStartsOpen(isCompact: boolean): boolean {
  return !isCompact;
}

/** Plan day list stays collapsed; the header owns Start/Continue. */
export function homePlanDaysStartsOpen(): boolean {
  return false;
}

/**
 * Create session and Plan Start/Continue yield the filled sky CTA when a
 * standalone in-progress Continue is already showing.
 */
export function homeCompetingCtaVariant(
  hasStandaloneInProgress: boolean,
): "primary" | "secondary" {
  return hasStandaloneInProgress ? "secondary" : "primary";
}

/**
 * Day row Start/Continue is hidden when the plan header already covers that day
 * (Continue for the open day, or Start for Next when nothing is open).
 */
export function homePlanDayShowsRowAction(input: {
  isContinuable: boolean;
  isNext: boolean;
  hasContinuable: boolean;
}): boolean {
  if (input.isContinuable) {
    return false;
  }
  if (input.isNext && !input.hasContinuable) {
    return false;
  }
  return true;
}
