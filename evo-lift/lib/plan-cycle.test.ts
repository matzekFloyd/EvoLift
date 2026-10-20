import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  continuablePlanSession,
  formatPlanSessionSource,
  latestSessionByPlanDay,
  nextPlanDayId,
  openSessionByPlanDay,
  type PlanCycleDay,
  type PlanCycleSession,
} from "./plan-cycle";

const days: PlanCycleDay[] = [
  { id: "day-a", position: 1 },
  { id: "day-b", position: 2 },
  { id: "day-c", position: 3 },
];

function session(
  planDayId: string | null,
  performedOn: string,
  createdAt: string,
  completedAt?: string | null,
): PlanCycleSession & { id: string } {
  return {
    id: `${planDayId ?? "none"}-${performedOn}-${createdAt}`,
    planDayId,
    performedOn,
    createdAt,
    completedAt,
  };
}

describe("nextPlanDayId", () => {
  it("returns null when the plan has no days", () => {
    assert.equal(nextPlanDayId([], [session("day-a", "2026-05-01", "2026-05-01T10:00:00Z")]), null);
  });

  it("starts at day 1 when no plan session points at a current day", () => {
    assert.equal(nextPlanDayId(days, []), "day-a");
    assert.equal(
      nextPlanDayId(days, [session(null, "2026-05-02", "2026-05-02T10:00:00Z")]),
      "day-a",
    );
  });

  it("advances from the latest plan day and wraps after the last day", () => {
    assert.equal(
      nextPlanDayId(days, [session("day-a", "2026-05-01", "2026-05-01T10:00:00Z")]),
      "day-b",
    );
    assert.equal(
      nextPlanDayId(days, [session("day-c", "2026-05-01", "2026-05-01T10:00:00Z")]),
      "day-a",
    );
  });

  it("moves the pointer from a day logged out of order", () => {
    const sessions = [
      session("day-a", "2026-05-01", "2026-05-01T10:00:00Z"),
      session("day-c", "2026-05-03", "2026-05-03T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions), "day-a");
  });

  it("advances from the latest use when the same day is logged twice", () => {
    const sessions = [
      session("day-b", "2026-05-02", "2026-05-02T10:00:00Z"),
      session("day-b", "2026-05-04", "2026-05-04T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions), "day-c");
  });

  it("uses performed_on first, then created_at", () => {
    const laterDate = [
      session("day-a", "2026-05-02", "2026-05-01T08:00:00Z"),
      session("day-b", "2026-05-01", "2026-05-03T08:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, laterDate), "day-b");

    const sameDate = [
      session("day-a", "2026-05-02", "2026-05-02T08:00:00Z"),
      session("day-b", "2026-05-02", "2026-05-02T12:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sameDate), "day-c");
  });

  it("ignores a session whose day is no longer on the plan", () => {
    const sessions = [
      session("day-b", "2026-05-01", "2026-05-01T10:00:00Z"),
      session("deleted-day", "2026-05-04", "2026-05-04T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions), "day-c");
  });

  it("orders days by position when the input is unsorted", () => {
    const reversed = [...days].reverse();
    assert.equal(nextPlanDayId(reversed, []), "day-a");
  });
});

describe("latestSessionByPlanDay", () => {
  it("keeps the latest session for each day", () => {
    const older = session("day-a", "2026-05-01", "2026-05-01T10:00:00Z");
    const newer = session("day-a", "2026-05-03", "2026-05-03T10:00:00Z");
    const other = session("day-b", "2026-05-02", "2026-05-02T10:00:00Z");
    const latest = latestSessionByPlanDay([older, other, newer]);
    assert.equal(latest.get("day-a")?.id, newer.id);
    assert.equal(latest.get("day-b")?.id, other.id);
    assert.equal(latest.has("day-c"), false);
  });
});

describe("continuablePlanSession", () => {
  it("returns the earliest unfinished session and ignores finished ones", () => {
    const later = session("day-b", "2026-05-08", "2026-05-01T10:00:00Z", null);
    const earlier = session("day-a", "2026-05-02", "2026-05-02T10:00:00Z", null);
    const finished = session("day-c", "2026-05-01", "2026-05-01T10:00:00Z", "2026-05-01T12:00:00Z");
    const unknown = session("day-c", "2026-04-01", "2026-04-01T10:00:00Z");
    const chosen = continuablePlanSession([later, finished, earlier, unknown]);
    assert.equal(chosen?.id, earlier.id);
  });

  it("returns null when every plan session is finished", () => {
    const finished = session("day-a", "2026-05-01", "2026-05-01T10:00:00Z", "2026-05-01T12:00:00Z");
    assert.equal(continuablePlanSession([finished]), null);
  });
});

describe("openSessionByPlanDay", () => {
  it("keeps the latest unfinished session and skips a finished day", () => {
    const finished = session("day-a", "2026-05-04", "2026-05-04T10:00:00Z", "2026-05-04T12:00:00Z");
    const olderOpen = session("day-a", "2026-05-01", "2026-05-01T10:00:00Z", null);
    const newerOpen = session("day-b", "2026-05-03", "2026-05-03T10:00:00Z", null);
    const olderOnB = session("day-b", "2026-05-02", "2026-05-02T10:00:00Z", null);
    const doneOnly = session("day-c", "2026-05-02", "2026-05-02T10:00:00Z", "2026-05-02T12:00:00Z");
    const open = openSessionByPlanDay([finished, olderOpen, newerOpen, olderOnB, doneOnly]);
    assert.equal(open.get("day-a")?.id, olderOpen.id);
    assert.equal(open.get("day-b")?.id, newerOpen.id);
    assert.equal(open.has("day-c"), false);
  });
});

describe("formatPlanSessionSource", () => {
  it("joins the plan and day names", () => {
    assert.equal(formatPlanSessionSource("Push / Pull", "Day A"), "Push / Pull · Day A");
    assert.equal(formatPlanSessionSource("Push / Pull", null), "Push / Pull");
    assert.equal(formatPlanSessionSource("  ", "Day A"), null);
  });
});
