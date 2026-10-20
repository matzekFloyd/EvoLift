import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  OTHER_SESSION_IN_PROGRESS_MESSAGE,
  canLogSetsOnSession,
  canMarkSessionCompleted,
  canStartOrContinueLogging,
  isSessionCompleted,
  isSessionInProgress,
  partitionHomeSessions,
  sessionLifecycleBadgeLabel,
  sessionLifecycleStatus,
  wouldStartSession,
} from "./session-lifecycle";

const TODAY = "2026-10-18";

function session(overrides: {
  performedOn?: string;
  startedAt?: string | null;
  completedAt?: string | null;
} = {}) {
  return {
    performedOn: overrides.performedOn ?? TODAY,
    startedAt: overrides.startedAt === undefined ? null : overrides.startedAt,
    completedAt: overrides.completedAt === undefined ? null : overrides.completedAt,
  };
}

describe("sessionLifecycleStatus", () => {
  it("treats future dates as planned even without lifecycle timestamps", () => {
    assert.equal(
      sessionLifecycleStatus(session({ performedOn: "2026-10-20" }), TODAY),
      "planned",
    );
  });

  it("prefers completed over in progress", () => {
    assert.equal(
      sessionLifecycleStatus(
        session({ startedAt: "2026-10-18T10:00:00Z", completedAt: "2026-10-18T11:00:00Z" }),
        TODAY,
      ),
      "completed",
    );
    assert.equal(
      isSessionCompleted(
        session({ startedAt: "2026-10-18T10:00:00Z", completedAt: "2026-10-18T11:00:00Z" }),
      ),
      true,
    );
  });

  it("marks started and unfinished sessions as in progress", () => {
    assert.equal(
      sessionLifecycleStatus(session({ startedAt: "2026-10-18T10:00:00Z" }), TODAY),
      "in_progress",
    );
    assert.equal(isSessionInProgress(session({ startedAt: "2026-10-18T10:00:00Z" }), TODAY), true);
  });

  it("keeps empty today or past sessions as not started", () => {
    assert.equal(sessionLifecycleStatus(session(), TODAY), "not_started");
    assert.equal(
      sessionLifecycleStatus(session({ performedOn: "2026-10-10" }), TODAY),
      "not_started",
    );
  });
});

describe("set logging exclusivity", () => {
  it("blocks sets on planned sessions", () => {
    assert.equal(canLogSetsOnSession(session({ performedOn: "2026-10-20" }), TODAY), false);
  });

  it("allows the first set when nothing else is in progress", () => {
    assert.equal(wouldStartSession(session()), true);
    assert.deepEqual(
      canStartOrContinueLogging({
        targetSessionId: "a",
        target: session(),
        otherInProgressSessionId: null,
      }),
      { ok: true },
    );
  });

  it("refuses starting a second in-progress session", () => {
    assert.deepEqual(
      canStartOrContinueLogging({
        targetSessionId: "b",
        target: session(),
        otherInProgressSessionId: "a",
      }),
      { ok: false, message: OTHER_SESSION_IN_PROGRESS_MESSAGE },
    );
  });

  it("allows more sets on the session that is already in progress", () => {
    assert.deepEqual(
      canStartOrContinueLogging({
        targetSessionId: "a",
        target: session({ startedAt: "2026-10-18T10:00:00Z" }),
        otherInProgressSessionId: "a",
      }),
      { ok: true },
    );
  });
});

describe("mark completed and badges", () => {
  it("allows mark completed for not started and in progress only", () => {
    assert.equal(canMarkSessionCompleted(session(), TODAY), true);
    assert.equal(
      canMarkSessionCompleted(session({ startedAt: "2026-10-18T10:00:00Z" }), TODAY),
      true,
    );
    assert.equal(
      canMarkSessionCompleted(
        session({ startedAt: "2026-10-18T10:00:00Z", completedAt: "2026-10-18T11:00:00Z" }),
        TODAY,
      ),
      false,
    );
    assert.equal(canMarkSessionCompleted(session({ performedOn: "2026-10-20" }), TODAY), false);
  });

  it("labels planned, in progress, and completed", () => {
    assert.equal(sessionLifecycleBadgeLabel("planned"), "Upcoming");
    assert.equal(sessionLifecycleBadgeLabel("in_progress"), "In progress");
    assert.equal(sessionLifecycleBadgeLabel("completed"), "Completed");
    assert.equal(sessionLifecycleBadgeLabel("not_started"), null);
  });
});

describe("partitionHomeSessions", () => {
  it("puts one in-progress session under Continue and keeps empty shells in history", () => {
    const partitioned = partitionHomeSessions(
      [
        { id: "planned", performedOn: "2026-10-20", startedAt: null, completedAt: null },
        {
          id: "active",
          performedOn: TODAY,
          startedAt: "2026-10-18T10:00:00Z",
          completedAt: null,
        },
        { id: "empty", performedOn: TODAY, startedAt: null, completedAt: null },
        {
          id: "done",
          performedOn: "2026-10-10",
          startedAt: "2026-10-10T10:00:00Z",
          completedAt: "2026-10-10T11:00:00Z",
        },
      ],
      TODAY,
    );
    assert.equal(partitioned.inProgress?.id, "active");
    assert.deepEqual(
      partitioned.planned.map((row) => row.id),
      ["planned"],
    );
    assert.deepEqual(
      partitioned.history.map((row) => row.id),
      ["empty", "done"],
    );
  });
});
