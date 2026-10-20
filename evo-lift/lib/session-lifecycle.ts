import { isFutureSessionDate, normalizeSessionDateOnly } from "@/lib/session-date";

export type SessionLifecycleStatus = "planned" | "not_started" | "in_progress" | "completed";

export type SessionLifecycleFields = {
  performedOn: string;
  startedAt: string | null;
  completedAt: string | null;
};

/** Shown when starting or reopening would exceed the open-session limit. */
export const MAX_OPEN_SESSIONS = 3;

export const OPEN_SESSION_LIMIT_MESSAGE =
  "You already have 3 open workout sessions. Finish one from Home before starting another.";

export function sessionLifecycleStatus(
  session: SessionLifecycleFields,
  todayYyyyMmDd?: string,
): SessionLifecycleStatus {
  if (session.completedAt != null) {
    return "completed";
  }
  if (todayYyyyMmDd != null) {
    if (normalizeSessionDateOnly(session.performedOn) > todayYyyyMmDd) {
      return "planned";
    }
  } else if (isFutureSessionDate(session.performedOn)) {
    return "planned";
  }
  if (session.startedAt != null) {
    return "in_progress";
  }
  return "not_started";
}

export function isSessionInProgress(session: SessionLifecycleFields, todayYyyyMmDd?: string): boolean {
  return sessionLifecycleStatus(session, todayYyyyMmDd) === "in_progress";
}

export function isSessionCompleted(session: SessionLifecycleFields): boolean {
  return session.completedAt != null;
}

/** Sets are blocked on future planned days (unchanged rule). */
export function canLogSetsOnSession(session: SessionLifecycleFields, todayYyyyMmDd?: string): boolean {
  return sessionLifecycleStatus(session, todayYyyyMmDd) !== "planned";
}

/** First set on this session would move it to in progress. */
export function wouldStartSession(session: SessionLifecycleFields): boolean {
  return session.startedAt == null && session.completedAt == null;
}

/**
 * Whether logging a set on `targetSessionId` is allowed given how many other sessions are open.
 * An open session is started and not finished. Pass 0 when none are open.
 */
export function canStartOrContinueLogging(input: {
  targetSessionId: string;
  target: SessionLifecycleFields;
  otherOpenSessionCount: number;
}): { ok: true } | { ok: false; message: string } {
  if (!canLogSetsOnSession(input.target)) {
    return { ok: false, message: "Sets cannot be logged on an upcoming session yet." };
  }
  if (!wouldStartSession(input.target)) {
    return { ok: true };
  }
  if (input.otherOpenSessionCount >= MAX_OPEN_SESSIONS) {
    return { ok: false, message: OPEN_SESSION_LIMIT_MESSAGE };
  }
  return { ok: true };
}

/**
 * A finished session stays read-only until it is reopened.
 * An unfinished session is editable.
 */
export function sessionIsReadOnly(completedAt: string | null): boolean {
  return completedAt != null;
}

export function sessionLifecycleBadgeLabel(status: SessionLifecycleStatus): string | null {
  switch (status) {
    case "planned":
      return "Upcoming";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "not_started":
      return null;
  }
}

export function canMarkSessionCompleted(session: SessionLifecycleFields, todayYyyyMmDd?: string): boolean {
  const status = sessionLifecycleStatus(session, todayYyyyMmDd);
  return status === "not_started" || status === "in_progress";
}

export function canUndoSessionCompleted(session: SessionLifecycleFields): boolean {
  return session.completedAt != null;
}

export type HomeSessionListItem = SessionLifecycleFields & { id: string };

/**
 * Home list split: open sessions for Continue (started, or created and not
 * finished), planned future dates, and history. Up to {@link MAX_OPEN_SESSIONS}
 * started sessions can be open.
 */
export function partitionHomeSessions<T extends HomeSessionListItem>(
  sessions: T[],
  todayYyyyMmDd: string,
): { inProgress: T[]; planned: T[]; history: T[] } {
  const inProgress: T[] = [];
  const planned: T[] = [];
  const history: T[] = [];

  for (const session of sessions) {
    const status = sessionLifecycleStatus(session, todayYyyyMmDd);
    if (status === "planned") {
      planned.push(session);
      continue;
    }
    if (status === "in_progress" || status === "not_started") {
      inProgress.push(session);
      continue;
    }
    history.push(session);
  }

  inProgress.sort((a, b) => {
    const aStarted = a.startedAt != null;
    const bStarted = b.startedAt != null;
    if (aStarted !== bStarted) {
      return aStarted ? -1 : 1;
    }
    if (a.startedAt && b.startedAt) {
      const byStart = b.startedAt.localeCompare(a.startedAt);
      if (byStart !== 0) {
        return byStart;
      }
    }
    return b.performedOn.localeCompare(a.performedOn);
  });
  planned.sort((a, b) => a.performedOn.localeCompare(b.performedOn));
  return { inProgress, planned, history };
}
