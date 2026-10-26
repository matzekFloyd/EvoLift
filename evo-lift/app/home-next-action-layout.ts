/** Session list under Past workouts starts closed. The chart is the history. */
export function homeSessionTableStartsOpen(): boolean {
  return false;
}

/** A saved draft is the filled action only when no in-progress session is already open. */
export function homeDraftIsFocal(hasDraft: boolean, hasStandaloneInProgress: boolean): boolean {
  return hasDraft && !hasStandaloneInProgress;
}

/**
 * The plan Start/Continue is the filled action when the plan can offer it
 * and neither an in-progress session nor a draft already does.
 */
export function homePlanIsFocal(input: {
  hasStandaloneInProgress: boolean;
  draftIsFocal: boolean;
  planOwnsForwardAction: boolean;
}): boolean {
  return input.planOwnsForwardAction && !input.hasStandaloneInProgress && !input.draftIsFocal;
}

/** Create session is filled only when nothing else on Home is the forward action. */
export function homeHeaderAddVariant(input: {
  hasStandaloneInProgress: boolean;
  draftIsFocal: boolean;
  planOwnsForwardAction: boolean;
}): "primary" | "secondary" {
  if (input.hasStandaloneInProgress || input.draftIsFocal || input.planOwnsForwardAction) {
    return "secondary";
  }
  return "primary";
}

/**
 * Continue and Start session share one right-hand column from the sm breakpoint up.
 * Wide enough for "Continue session" plus its icon. On a phone they stay as wide as
 * the label so the date and the day name can stay on one line.
 */
export const homeForwardActionClassName = "shrink-0 sm:min-w-[10.75rem]";

/** The first open session keeps the filled Continue. Later ones stay secondary. */
export function homeInProgressCtaVariant(isFirst: boolean): "primary" | "secondary" {
  return isFirst ? "primary" : "secondary";
}

/** Plan day list stays collapsed; the header owns Start/Continue. */
export function homePlanDaysStartsOpen(): boolean {
  return false;
}

/**
 * Plan Start/Continue yields the filled sky CTA when another forward action
 * (an in-progress session or a draft) is already showing.
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
