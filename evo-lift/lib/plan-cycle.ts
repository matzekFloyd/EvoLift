export type PlanCycleDay = {
  id: string;
  position: number;
};

export type PlanCycleSession = {
  planDayId: string | null;
  performedOn: string;
  createdAt: string;
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
 * Next day in plan order.
 * Only sessions whose day is still on the plan count. No such session means day 1.
 * After the last day, the cycle returns to day 1.
 */
export function nextPlanDayId(
  days: PlanCycleDay[],
  sessions: PlanCycleSession[],
): string | null {
  const ordered = orderedDays(days);
  if (ordered.length === 0) {
    return null;
  }

  const dayIds = new Set(ordered.map((day) => day.id));
  const latest = sessions
    .filter((session) => session.planDayId != null && dayIds.has(session.planDayId))
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
