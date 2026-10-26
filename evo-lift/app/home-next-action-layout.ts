import { PLAN_ALREADY_OPEN_MESSAGE } from "@/lib/plan-cycle";

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

/** Phone layout for the plan day list. Same split as the compact home layout. */
export const HOME_PLAN_COMPACT_MEDIA_QUERY = "(max-width: 768px)";

export const PLAN_DAY_NEEDS_EXERCISE_MESSAGE = "Add at least one exercise to this day.";

export function homePlanDayFinishBeforeStartMessage(dayName: string | null): string {
  return dayName ? `Finish ${dayName} before starting another day.` : PLAN_ALREADY_OPEN_MESSAGE;
}

/**
 * Day row Start is hidden on a phone. From the compact breakpoint up it is hidden
 * when the plan header already covers that day (Continue for the open day, or
 * Start for Next when nothing is open).
 */
export function homePlanDayShowsRowAction(input: {
  isCompact: boolean;
  isContinuable: boolean;
  isNext: boolean;
  hasContinuable: boolean;
}): boolean {
  if (input.isCompact) {
    return false;
  }
  if (input.isContinuable) {
    return false;
  }
  if (input.isNext && !input.hasContinuable) {
    return false;
  }
  return true;
}

/**
 * On a phone, the day row opens Start session when the day has exercises and
 * no plan day is already open. A wide screen keeps the Start button instead.
 */
export function homePlanDayRowStartsSession(input: {
  isCompact: boolean;
  exerciseCount: number;
  hasContinuable: boolean;
}): boolean {
  return input.isCompact && input.exerciseCount > 0 && !input.hasContinuable;
}

/** Why a day row cannot start, or null when the row may open Start session. */
export function homePlanDayStartBlockedMessage(input: {
  hasContinuable: boolean;
  exerciseCount: number;
  continuableDayName: string | null;
}): string | null {
  if (input.hasContinuable) {
    return homePlanDayFinishBeforeStartMessage(input.continuableDayName);
  }
  if (input.exerciseCount === 0) {
    return PLAN_DAY_NEEDS_EXERCISE_MESSAGE;
  }
  return null;
}

/** Accessible name for a phone day row that opens Start session. */
export function homePlanDayRowStartLabel(dayName: string): string {
  return `Start session from ${dayName}`;
}

/**
 * Wash for a phone day row. Next is already sky, so it deepens.
 * Other days lift off the muted inset.
 */
export function homePlanDayRowHoverClass(isNext: boolean): string {
  return isNext
    ? "transition-colors hover:bg-sky-100 active:bg-sky-100"
    : "transition-colors hover:bg-zinc-100 active:bg-zinc-100";
}
