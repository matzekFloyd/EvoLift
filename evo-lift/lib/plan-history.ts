/**
 * Rules for plan activation history and which sessions belong to a plan.
 * The backfill in `supabase/migrations/20261121160000_plan_activation_history.sql`
 * follows the same rules. `createdAt` values must be sortable ISO timestamps.
 */

export type PlanHistorySession = {
  id: string;
  createdAt: string;
  planId: string | null;
  /** Unfinished and not started from a plan. Backfill leaves these unassigned. */
  open?: boolean;
};

export type PlanActivationPeriod = {
  planId: string;
  activatedAt: string;
  deactivatedAt: string | null;
};

export function reconstructPlanActivations(input: {
  sessions: readonly PlanHistorySession[];
  activePlanId: string | null;
  /** Used when the active plan has no open period reconstructed from sessions. */
  activeSince: string;
}): PlanActivationPeriod[] {
  const tagged = input.sessions
    .filter((session): session is PlanHistorySession & { planId: string } => session.planId !== null)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  const runs: Array<{ planId: string; activatedAt: string; lastAt: string }> = [];
  for (const session of tagged) {
    const current = runs[runs.length - 1];
    if (!current || current.planId !== session.planId) {
      runs.push({
        planId: session.planId,
        activatedAt: session.createdAt,
        lastAt: session.createdAt,
      });
    } else if (session.createdAt > current.lastAt) {
      current.lastAt = session.createdAt;
    }
  }

  const periods: PlanActivationPeriod[] = runs.map((run, index) => {
    const next = runs[index + 1];
    let deactivatedAt: string | null;
    if (next) {
      deactivatedAt = next.activatedAt;
    } else if (run.planId === input.activePlanId) {
      deactivatedAt = null;
    } else {
      deactivatedAt = run.lastAt;
    }
    return {
      planId: run.planId,
      activatedAt: run.activatedAt,
      deactivatedAt,
    };
  });

  const activeIsOpen =
    input.activePlanId !== null &&
    periods.some((period) => period.planId === input.activePlanId && period.deactivatedAt === null);
  if (input.activePlanId !== null && !activeIsOpen) {
    periods.push({
      planId: input.activePlanId,
      activatedAt: input.activeSince,
      deactivatedAt: null,
    });
  }

  return periods;
}

/** Plan a session keeps. Tagged sessions stay on their plan. Untagged sessions match one window or stay unassigned. */
export function planIdForSession(
  session: PlanHistorySession,
  periods: readonly PlanActivationPeriod[],
): string | null {
  if (session.planId !== null) {
    return session.planId;
  }
  if (session.open) {
    return null;
  }
  const matches = periods.filter(
    (period) =>
      session.createdAt >= period.activatedAt &&
      (period.deactivatedAt === null || session.createdAt < period.deactivatedAt),
  );
  if (matches.length !== 1) {
    return null;
  }
  return matches[0].planId;
}

/** First snapshot keeps the current version. A later identical snapshot does too. A change bumps by one. */
export function nextPlanContentVersion(
  currentVersion: number,
  previousSnapshot: unknown | null,
  nextSnapshot: unknown,
): number {
  if (previousSnapshot === null) {
    return currentVersion;
  }
  if (JSON.stringify(previousSnapshot) === JSON.stringify(nextSnapshot)) {
    return currentVersion;
  }
  return currentVersion + 1;
}

/** Sessions without a plan store no version. A missing version is filled from the plan. An explicit version is kept. */
export function sessionPlanVersion(
  planId: string | null,
  planVersion: number | null,
  contentVersion: number | null,
): number | null {
  if (planId === null) {
    return null;
  }
  if (planVersion !== null) {
    return planVersion;
  }
  return contentVersion;
}
