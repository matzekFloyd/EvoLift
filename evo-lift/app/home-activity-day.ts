export type ActivityDaySession = {
  id: string;
  performedOn: string;
  createdAt: string;
};

export type ActivityDayOpen =
  | { kind: "none" }
  | { kind: "session"; sessionId: string }
  | { kind: "choose"; sessionIds: string[] };

/** Sessions on one calendar day, earliest first. */
export function activityDaySessionIds(sessions: ActivityDaySession[], day: string): string[] {
  return sessions
    .filter((session) => session.performedOn.slice(0, 10) === day)
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    )
    .map((session) => session.id);
}

/** One session opens directly. Several sessions on that day need a choice. */
export function activityDayOpen(sessionIds: readonly string[]): ActivityDayOpen {
  if (sessionIds.length === 0) {
    return { kind: "none" };
  }
  if (sessionIds.length === 1) {
    return { kind: "session", sessionId: sessionIds[0] };
  }
  return { kind: "choose", sessionIds: [...sessionIds] };
}
