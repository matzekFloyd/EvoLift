import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  nextPlanContentVersion,
  planIdForSession,
  reconstructPlanActivations,
  sessionPlanVersion,
  type PlanHistorySession,
} from "./plan-history";

const planA = "plan-a";
const planB = "plan-b";

function session(id: string, createdAt: string, planId: string | null): PlanHistorySession {
  return { id, createdAt, planId };
}

describe("reconstructPlanActivations", () => {
  it("opens the current plan from its first tagged session", () => {
    const periods = reconstructPlanActivations({
      sessions: [session("s1", "2026-01-02T10:00:00.000Z", planA)],
      activePlanId: planA,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.deepEqual(periods, [
      { planId: planA, activatedAt: "2026-01-02T10:00:00.000Z", deactivatedAt: null },
    ]);
  });

  it("closes a plan when the next tagged session uses a different plan", () => {
    const periods = reconstructPlanActivations({
      sessions: [
        session("s1", "2026-01-02T10:00:00.000Z", planA),
        session("s2", "2026-02-01T10:00:00.000Z", planA),
        session("s3", "2026-03-01T10:00:00.000Z", planB),
      ],
      activePlanId: planB,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.deepEqual(periods, [
      {
        planId: planA,
        activatedAt: "2026-01-02T10:00:00.000Z",
        deactivatedAt: "2026-03-01T10:00:00.000Z",
      },
      { planId: planB, activatedAt: "2026-03-01T10:00:00.000Z", deactivatedAt: null },
    ]);
  });

  it("closes the last run when that plan is no longer active", () => {
    const periods = reconstructPlanActivations({
      sessions: [session("s1", "2026-01-02T10:00:00.000Z", planA)],
      activePlanId: planB,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.deepEqual(periods, [
      {
        planId: planA,
        activatedAt: "2026-01-02T10:00:00.000Z",
        deactivatedAt: "2026-01-02T10:00:00.000Z",
      },
      { planId: planB, activatedAt: "2026-06-01T00:00:00.000Z", deactivatedAt: null },
    ]);
  });

  it("opens an active plan that has no tagged sessions without claiming earlier time", () => {
    const periods = reconstructPlanActivations({
      sessions: [session("free", "2026-01-01T10:00:00.000Z", null)],
      activePlanId: planA,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.deepEqual(periods, [
      { planId: planA, activatedAt: "2026-06-01T00:00:00.000Z", deactivatedAt: null },
    ]);
  });

  it("starts a new period when the lifter switches back to an earlier plan", () => {
    const periods = reconstructPlanActivations({
      sessions: [
        session("s1", "2026-01-01T00:00:00.000Z", planA),
        session("s2", "2026-02-01T00:00:00.000Z", planB),
        session("s3", "2026-03-01T00:00:00.000Z", planA),
      ],
      activePlanId: planA,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.equal(periods.filter((period) => period.deactivatedAt === null).length, 1);
    assert.equal(periods[2]?.planId, planA);
    assert.equal(periods[2]?.activatedAt, "2026-03-01T00:00:00.000Z");
  });
});

describe("planIdForSession", () => {
  const periods = reconstructPlanActivations({
    sessions: [
      session("s1", "2026-01-02T10:00:00.000Z", planA),
      session("s2", "2026-03-01T10:00:00.000Z", planB),
    ],
    activePlanId: planB,
    activeSince: "2026-06-01T00:00:00.000Z",
  });

  it("leaves sessions from before the first plan session unassigned", () => {
    assert.equal(
      planIdForSession(session("early", "2026-01-01T10:00:00.000Z", null), periods),
      null,
    );
  });

  it("assigns a free session during a plan's window to that plan", () => {
    assert.equal(
      planIdForSession(session("mid", "2026-02-01T10:00:00.000Z", null), periods),
      planA,
    );
  });

  it("assigns a session logged at the switch to the plan that starts then", () => {
    assert.equal(
      planIdForSession(session("switch", "2026-03-01T10:00:00.000Z", null), periods),
      planB,
    );
  });

  it("leaves an unfinished free session unassigned", () => {
    assert.equal(
      planIdForSession({ ...session("open", "2026-02-01T10:00:00.000Z", null), open: true }, periods),
      null,
    );
  });

  it("keeps a session that already names a plan", () => {
    assert.equal(
      planIdForSession(session("kept", "2026-01-01T00:00:00.000Z", planA), periods),
      planA,
    );
  });

  it("leaves a session unassigned when two windows match", () => {
    assert.equal(
      planIdForSession(session("both", "2026-02-01T00:00:00.000Z", null), [
        { planId: planA, activatedAt: "2026-01-01T00:00:00.000Z", deactivatedAt: null },
        { planId: planB, activatedAt: "2026-01-15T00:00:00.000Z", deactivatedAt: null },
      ]),
      null,
    );
  });

  it("does not assign older free sessions to an active plan with no history", () => {
    const openNow = reconstructPlanActivations({
      sessions: [],
      activePlanId: planA,
      activeSince: "2026-06-01T00:00:00.000Z",
    });
    assert.equal(
      planIdForSession(session("old", "2026-01-01T00:00:00.000Z", null), openNow),
      null,
    );
  });
});

describe("nextPlanContentVersion", () => {
  it("keeps the current version for the first snapshot and for an unchanged one", () => {
    const snapshot = { name: "Full body", days: [] };
    assert.equal(nextPlanContentVersion(1, null, snapshot), 1);
    assert.equal(nextPlanContentVersion(1, snapshot, snapshot), 1);
  });

  it("bumps the version when the snapshot changes", () => {
    assert.equal(nextPlanContentVersion(1, { name: "Full body" }, { name: "Upper" }), 2);
  });
});

describe("sessionPlanVersion", () => {
  it("stores no version when the session has no plan", () => {
    assert.equal(sessionPlanVersion(null, 3, 4), null);
  });

  it("fills a missing version from the plan and keeps an explicit one", () => {
    assert.equal(sessionPlanVersion(planA, null, 2), 2);
    assert.equal(sessionPlanVersion(planA, 1, 4), 1);
  });
});
