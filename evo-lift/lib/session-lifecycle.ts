import { isFutureSessionDate, normalizeSessionDateOnly } from "@/lib/session-date";

export type SessionLifecycleStatus = "planned" | "not_started" | "in_progress" | "completed";

export type SessionLifecycleFields = {
  performedOn: string;
  startedAt: string | null;
  completedAt: string | null;
};

/** Shown when logging a set would start a second in-progress session. */
export const OTHER_SESSION_IN_PROGRESS_MESSAGE =
  "Finish the workout session already in progress first. Open it from Home with Continue, then mark it completed.";

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
 * Whether logging a set on `targetSessionId` is allowed given another in-progress session.
 * Pass null when no other session is in progress.
 */
export function canStartOrContinueLogging(input: {
  targetSessionId: string;
  target: SessionLifecycleFields;
  otherInProgressSessionId: string | null;
}): { ok: true } | { ok: false; message: string } {
  if (!canLogSetsOnSession(input.target)) {
    return { ok: false, message: "Sets cannot be logged on a planned session yet." };
  }
  if (!wouldStartSession(input.target)) {
    return { ok: true };
  }
  if (
    input.otherInProgressSessionId != null &&
    input.otherInProgressSessionId !== input.targetSessionId
  ) {
    return { ok: false, message: OTHER_SESSION_IN_PROGRESS_MESSAGE };
  }
  return { ok: true };
}

export function sessionLifecycleBadgeLabel(status: SessionLifecycleStatus): string | null {
  switch (status) {
    case "planned":
      return "Planned";
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

export type HomeSessionListItem = SessionLifecycleFields & { id: string };

/**
 * Home list split: one Continue target, planned (future date), and history
 * (completed plus not-started shells). In-progress is excluded from history.
 */
export function partitionHomeSessions<T extends HomeSessionListItem>(
  sessions: T[],
  todayYyyyMmDd: string,
): { inProgress: T | null; planned: T[]; history: T[] } {
  let inProgress: T | null = null;
  const planned: T[] = [];
  const history: T[] = [];

  for (const session of sessions) {
    const status = sessionLifecycleStatus(session, todayYyyyMmDd);
    if (status === "planned") {
      planned.push(session);
      continue;
    }
    if (status === "in_progress") {
      if (inProgress == null) {
        inProgress = session;
      }
      continue;
    }
    history.push(session);
  }

  planned.sort((a, b) => a.performedOn.localeCompare(b.performedOn));
  return { inProgress, planned, history };
}
