/**
 * Space reserved on Home while `home_session_summaries` (and the active plan) load.
 * The reserved blocks match the loaded demo layout so Past workouts does not jump in.
 */

/** `SessionsTable` shows 20 rows per page. */
export const HOME_PAST_WORKOUT_PLACEHOLDER_ROWS = 20;

/** Upcoming workouts on the local demo account: two future sessions. */
export const HOME_UPCOMING_PLACEHOLDER_ROWS = 2;

/** Active plan body while that request is in flight. A short day list fits here. */
export const HOME_PLAN_LOADING_CLASSNAME = "min-h-64";
