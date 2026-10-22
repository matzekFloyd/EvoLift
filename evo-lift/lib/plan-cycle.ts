export type PlanCycleDay = {
  id: string;
  position: number;
};

export type PlanCycleSession = {
  planDayId: string | null;
  performedOn: string;
  createdAt: string;
  /** Null when the session is not finished. Omitted sessions are treated as open. */
  completedAt?: string | null;
};

function sessionDate(value: string): string {
  return value.slice(0, 10);
}

/** Latest performed_on, then latest created_at. */
export function comparePlanSessionsDesc(a: PlanCycleSession, b: PlanCycleSession): number {
  const byDate = sessionDate(b.performedOn).localeCompare(sessionDate(a.performedOn));
  if (byDate !== 0) {
    return byDate;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

function orderedDays(days: PlanCycleDay[]): PlanCycleDay[] {
  return [...days].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/**
 * True when this unfinished plan session can be logged now.
 * An upcoming session (performed on after today) does not block the plan.
 */
export function planSessionBlocksAnotherDay(
  session: Pick<PlanCycleSession, "planDayId" | "performedOn" | "completedAt">,
  todayYyyyMmDd: string,
): boolean {
  return (
    session.planDayId != null &&
    session.completedAt === null &&
    sessionDate(session.performedOn) <= todayYyyyMmDd
  );
}

/**
 * Next day in plan order.
 * Only sessions whose day is still on the plan, and whose date is today or earlier, count.
 * A future session has not been trained, so it does not move the pointer.
 * No such session means day 1. After the last day, the cycle returns to day 1.
 */
export function nextPlanDayId(
  days: PlanCycleDay[],
  sessions: PlanCycleSession[],
  todayYyyyMmDd: string,
): string | null {
  const ordered = orderedDays(days);
  if (ordered.length === 0) {
    return null;
  }

  const dayIds = new Set(ordered.map((day) => day.id));
  const latest = sessions
    .filter(
      (session) =>
        session.planDayId != null &&
        dayIds.has(session.planDayId) &&
        sessionDate(session.performedOn) <= todayYyyyMmDd,
    )
    .sort(comparePlanSessionsDesc)[0];

  if (!latest?.planDayId) {
    return ordered[0].id;
  }

  const index = ordered.findIndex((day) => day.id === latest.planDayId);
  if (index < 0) {
    return ordered[0].id;
  }
  return ordered[(index + 1) % ordered.length].id;
}

export const PLAN_ALREADY_OPEN_MESSAGE =
  "Finish the open plan session before starting another day.";

/**
 * Latest upcoming session for one plan day.
 * Starting that day reuses this session instead of creating a second one.
 */
export function upcomingSessionOnPlanDay<T extends PlanCycleSession>(
  sessions: T[],
  planDayId: string,
  todayYyyyMmDd: string,
): T | null {
  const upcoming = sessions.filter(
    (session) =>
      session.planDayId === planDayId &&
      session.completedAt === null &&
      sessionDate(session.performedOn) > todayYyyyMmDd,
  );
  if (upcoming.length === 0) {
    return null;
  }
  return [...upcoming].sort(comparePlanSessionsDesc)[0];
}

/**
 * The one unfinished plan session that can be continued.
 * Upcoming sessions are excluded: sets cannot be logged on them yet.
 * When several can be logged, this is the earliest performed date.
 * Sessions with an unknown completedAt are ignored.
 */
export function continuablePlanSession<T extends PlanCycleSession>(
  sessions: T[],
  todayYyyyMmDd: string,
): T | null {
  const open = sessions.filter((session) => planSessionBlocksAnotherDay(session, todayYyyyMmDd));
  if (open.length === 0) {
    return null;
  }
  return [...open].sort((a, b) => {
    const byDate = sessionDate(a.performedOn).localeCompare(sessionDate(b.performedOn));
    if (byDate !== 0) {
      return byDate;
    }
    return a.createdAt.localeCompare(b.createdAt);
  })[0];
}

/** Latest unfinished session for each plan day. Finished sessions do not count. */
export function openSessionByPlanDay<T extends PlanCycleSession>(sessions: T[]): Map<string, T> {
  return latestSessionByPlanDay(sessions.filter((session) => session.completedAt == null));
}

export function latestSessionByPlanDay<T extends PlanCycleSession>(sessions: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const session of sessions) {
    if (!session.planDayId) {
      continue;
    }
    const current = latest.get(session.planDayId);
    if (!current || comparePlanSessionsDesc(session, current) < 0) {
      latest.set(session.planDayId, session);
    }
  }
  return latest;
}

export function formatPlanSessionSource(
  planName: string | null | undefined,
  dayName: string | null | undefined,
): string | null {
  const plan = planName?.trim() ? planName.trim() : null;
  const day = dayName?.trim() ? dayName.trim() : null;
  if (plan && day) {
    return `${plan} · ${day}`;
  }
  return plan;
}
