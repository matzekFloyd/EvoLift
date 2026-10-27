/**
 * Footprints for the shared in-flight placeholder.
 * Lists reserve a typical first screen. A chart reserves that chart's height.
 */

/** Muted bar used for every placeholder. */
export const CONTENT_PLACEHOLDER_SURFACE_CLASS =
  "rounded-md border border-zinc-200 bg-zinc-50/80";

/** One list or table row. */
export const CONTENT_PLACEHOLDER_ROW_CLASS = "h-10";

/** First screen of a named list such as plans or templates. */
export const NAMED_LIST_PLACEHOLDER_ROWS = 6;

/** Single tall block. The exercises page uses `NAMED_LIST_PLACEHOLDER_ROWS`. */
export const EXERCISE_LIST_PLACEHOLDER_CLASS = "h-96";

/** A short token table. */
export const API_TOKEN_PLACEHOLDER_ROWS = 2;

/** Goal cards. A new account starts with a few barbell goals. */
export const GOAL_CARD_PLACEHOLDER_ROWS = 4;
export const GOAL_CARD_PLACEHOLDER_CLASS = "h-24";

/** Three summary badges on Insights. */
export const INSIGHTS_KPI_PLACEHOLDER_COUNT = 3;
export const INSIGHTS_KPI_PLACEHOLDER_CLASS = "h-14";

/**
 * Weekly insights chart (`InsightsWeeklyVolumeChart`: `h-56` / `sm:h-72`).
 * The other insight charts start collapsed, so this one block stands in for that stack.
 */
export const INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS = "h-56 sm:h-72";

/** Session weight, estimated 1RM, and volume charts (`h-52` / `sm:h-64`). */
export const EXERCISE_CHART_HEIGHT_CLASS = "h-52 sm:h-64";

/** First screen of an exercise history table. */
export const EXERCISE_HISTORY_PLACEHOLDER_ROWS = 8;

/** A few exercise blocks on a workout session. */
export const SESSION_LOG_PLACEHOLDER_ROWS = 3;
export const SESSION_LOG_PLACEHOLDER_CLASS = "h-32";

/** Plan or template editor: name, notes, and a couple of day or exercise rows. */
export const EDITOR_PLACEHOLDER_ROWS = 4;
export const EDITOR_PLACEHOLDER_CLASS = "h-16";

/** First screen of account settings fields. */
export const ACCOUNT_PLACEHOLDER_ROWS = 4;
export const ACCOUNT_PLACEHOLDER_CLASS = "h-16";

/** API docs explorer. */
export const DOCS_PLACEHOLDER_CLASS = "min-h-[32rem]";

/** New workout session form. */
export const NEW_SESSION_PLACEHOLDER_ROWS = 6;

export function contentPlaceholderIndexes(count: number): number[] {
  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }
  return Array.from({ length: Math.floor(count) }, (_, index) => index);
}
