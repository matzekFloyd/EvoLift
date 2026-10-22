import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  continuablePlanSession,
  formatPlanSessionSource,
  latestSessionByPlanDay,
  nextPlanDayId,
  openSessionByPlanDay,
  planSessionBlocksAnotherDay,
  upcomingSessionOnPlanDay,
  type PlanCycleDay,
  type PlanCycleSession,
} from "./plan-cycle";

const today = "2026-06-01";

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
    assert.equal(
      nextPlanDayId([], [session("day-a", "2026-05-01", "2026-05-01T10:00:00Z")], today),
      null,
    );
  });

  it("starts at day 1 when no plan session points at a current day", () => {
    assert.equal(nextPlanDayId(days, [], today), "day-a");
    assert.equal(
      nextPlanDayId(days, [session(null, "2026-05-02", "2026-05-02T10:00:00Z")], today),
      "day-a",
    );
  });

  it("advances from the latest plan day and wraps after the last day", () => {
    assert.equal(
      nextPlanDayId(days, [session("day-a", "2026-05-01", "2026-05-01T10:00:00Z")], today),
      "day-b",
    );
    assert.equal(
      nextPlanDayId(days, [session("day-c", "2026-05-01", "2026-05-01T10:00:00Z")], today),
      "day-a",
    );
  });

  it("moves the pointer from a day logged out of order", () => {
    const sessions = [
      session("day-a", "2026-05-01", "2026-05-01T10:00:00Z"),
      session("day-c", "2026-05-03", "2026-05-03T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions, today), "day-a");
  });

  it("advances from the latest use when the same day is logged twice", () => {
    const sessions = [
      session("day-b", "2026-05-02", "2026-05-02T10:00:00Z"),
      session("day-b", "2026-05-04", "2026-05-04T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions, today), "day-c");
  });

  it("uses performed_on first, then created_at", () => {
    const laterDate = [
      session("day-a", "2026-05-02", "2026-05-01T08:00:00Z"),
      session("day-b", "2026-05-01", "2026-05-03T08:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, laterDate, today), "day-b");

    const sameDate = [
      session("day-a", "2026-05-02", "2026-05-02T08:00:00Z"),
      session("day-b", "2026-05-02", "2026-05-02T12:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sameDate, today), "day-c");
  });

  it("ignores a session whose day is no longer on the plan", () => {
    const sessions = [
      session("day-b", "2026-05-01", "2026-05-01T10:00:00Z"),
      session("deleted-day", "2026-05-04", "2026-05-04T10:00:00Z"),
    ];
    assert.equal(nextPlanDayId(days, sessions, today), "day-c");
  });

  it("orders days by position when the input is unsorted", () => {
    const reversed = [...days].reverse();
    assert.equal(nextPlanDayId(reversed, [], today), "day-a");
  });

  it("ignores a future session so an upcoming date does not move the pointer", () => {
    const sessions = [
      session("day-c", "2026-05-01", "2026-05-01T10:00:00Z", "2026-05-01T12:00:00Z"),
      session("day-a", "2026-08-01", "2026-05-02T10:00:00Z", null),
    ];
    assert.equal(nextPlanDayId(days, sessions, "2026-05-02"), "day-a");
    assert.equal(nextPlanDayId(days, [sessions[1]], "2026-05-02"), "day-a");
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
    const chosen = continuablePlanSession([later, finished, earlier, unknown], today);
    assert.equal(chosen?.id, earlier.id);
  });

  it("returns null when every plan session is finished", () => {
    const finished = session("day-a", "2026-05-01", "2026-05-01T10:00:00Z", "2026-05-01T12:00:00Z");
    assert.equal(continuablePlanSession([finished], today), null);
  });

  it("ignores an upcoming session so Continue does not open a date you cannot log", () => {
    const upcoming = session("day-a", "2028-03-06", "2026-10-22T10:00:00Z", null);
    const loggable = session("day-b", "2026-10-21", "2026-10-21T10:00:00Z", null);
    assert.equal(continuablePlanSession([upcoming], "2026-10-22"), null);
    assert.equal(continuablePlanSession([upcoming, loggable], "2026-10-22")?.id, loggable.id);
  });
});

describe("planSessionBlocksAnotherDay", () => {
  it("blocks a loggable unfinished session and ignores an upcoming one", () => {
    const loggable = session("day-a", "2026-10-22", "2026-10-22T10:00:00Z", null);
    const upcoming = session("day-b", "2028-03-06", "2026-10-22T10:00:00Z", null);
    const finished = session("day-c", "2026-10-16", "2026-10-16T10:00:00Z", "2026-10-16T12:00:00Z");
    assert.equal(planSessionBlocksAnotherDay(loggable, "2026-10-22"), true);
    assert.equal(planSessionBlocksAnotherDay(upcoming, "2026-10-22"), false);
    assert.equal(planSessionBlocksAnotherDay(finished, "2026-10-22"), false);
    assert.equal(
      planSessionBlocksAnotherDay(
        session(null, "2026-10-22", "2026-10-22T10:00:00Z", null),
        "2026-10-22",
      ),
      false,
    );
  });
});

describe("upcomingSessionOnPlanDay", () => {
  it("returns the latest upcoming session on that day", () => {
    const earlier = session("day-a", "2026-11-01", "2026-10-01T10:00:00Z", null);
    const later = session("day-a", "2028-03-06", "2026-10-22T10:00:00Z", null);
    const otherDay = session("day-b", "2028-04-01", "2026-10-22T10:00:00Z", null);
    const finished = session("day-a", "2028-05-01", "2026-10-22T11:00:00Z", "2026-10-22T12:00:00Z");
    const past = session("day-a", "2026-10-16", "2026-10-16T10:00:00Z", null);
    const chosen = upcomingSessionOnPlanDay(
      [earlier, otherDay, finished, past, later],
      "day-a",
      "2026-10-22",
    );
    assert.equal(chosen?.id, later.id);
    assert.equal(upcomingSessionOnPlanDay([past], "day-a", "2026-10-22"), null);
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
