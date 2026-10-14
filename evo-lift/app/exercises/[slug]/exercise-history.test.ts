import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  clampDateToMaxYyyyMmDd,
  compareExerciseSetHistoryForPerformedOn,
  isRowEarlier,
  parseExerciseDetailFiltersFromSearchParams,
  sortExerciseHistoryRowsCanonical,
  type ExerciseHistoryOrderRow,
} from "./exercise-history";

const defaults = { from: "2025-10-14", to: "2026-10-14" };
const today = "2026-10-14";

function params(values: Record<string, string>): { get: (name: string) => string | null } {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

function row(
  performedOn: string,
  sessionCreatedAt: string,
  setNumber: number,
  sessionId = sessionCreatedAt,
): ExerciseHistoryOrderRow {
  return { performedOn, sessionCreatedAt, setNumber, sessionId };
}

describe("exercise history date filters", () => {
  it("clamps a future date to today", () => {
    assert.equal(clampDateToMaxYyyyMmDd("2026-12-01", today), today);
    assert.equal(clampDateToMaxYyyyMmDd("2026-10-01", today), "2026-10-01");
  });

  it("uses the defaults and hides warmups when the query is empty", () => {
    assert.deepEqual(parseExerciseDetailFiltersFromSearchParams(params({}), defaults, today), {
      from: defaults.from,
      to: defaults.to,
      hideWarmups: true,
    });
  });

  it("ignores a date that is not YYYY-MM-DD and clamps a future bound", () => {
    assert.deepEqual(
      parseExerciseDetailFiltersFromSearchParams(
        params({ from: "Oct 1", to: "2026-12-01" }),
        defaults,
        today,
      ),
      { from: defaults.from, to: today, hideWarmups: true },
    );
  });

  it("swaps the bounds when from is after to", () => {
    assert.deepEqual(
      parseExerciseDetailFiltersFromSearchParams(
        params({ from: "2026-10-10", to: "2026-10-01" }),
        defaults,
        today,
      ),
      { from: "2026-10-01", to: "2026-10-10", hideWarmups: true },
    );
  });

  it("shows warmups only for an explicit off flag, and the old kind=working query still hides them", () => {
    assert.equal(
      parseExerciseDetailFiltersFromSearchParams(params({ hideWarmups: "0" }), defaults, today).hideWarmups,
      false,
    );
    assert.equal(
      parseExerciseDetailFiltersFromSearchParams(params({ hideWarmups: "no", kind: "working" }), defaults, today)
        .hideWarmups,
      true,
    );
  });
});

describe("exercise history order", () => {
  const rows = [
    row("2026-10-14", "2026-10-14T08:00:00.000Z", 1, "session-a"),
    row("2026-10-14", "2026-10-14T18:00:00.000Z", 1, "session-b"),
    row("2026-10-14", "2026-10-14T18:00:00.000Z", 3, "session-b"),
    row("2026-10-12", "2026-10-12T08:00:00.000Z", 2, "session-c"),
  ];

  it("orders by session date, then session, then set number", () => {
    const sorted = sortExerciseHistoryRowsCanonical([...rows]);
    assert.deepEqual(
      sorted.map((item) => `${item.performedOn} ${item.sessionId} #${item.setNumber}`),
      [
        "2026-10-14 session-b #3",
        "2026-10-14 session-b #1",
        "2026-10-14 session-a #1",
        "2026-10-12 session-c #2",
      ],
    );
  });

  it("reverses the date and puts set 1 first when the direction is ascending", () => {
    const sorted = [...rows].sort((left, right) =>
      compareExerciseSetHistoryForPerformedOn(left, right, "asc"),
    );
    assert.equal(sorted[0]?.sessionId, "session-c");
    assert.equal(sorted.at(-1)?.setNumber, 3);
  });

  it("treats an earlier day, session, or set number as earlier", () => {
    const first = rows[0];
    const laterSession = rows[1];
    const laterSet = rows[2];
    const earlierDay = rows[3];
    assert.equal(isRowEarlier(earlierDay, first), true);
    assert.equal(isRowEarlier(first, laterSession), true);
    assert.equal(isRowEarlier(laterSession, laterSet), true);
    assert.equal(isRowEarlier(laterSet, laterSession), false);
  });

  it("breaks a full tie by session id", () => {
    const earlier = row("2026-10-14", "2026-10-14T08:00:00.000Z", 1, "aaa");
    const later = row("2026-10-14", "2026-10-14T08:00:00.000Z", 1, "zzz");
    assert.ok(compareExerciseSetHistoryForPerformedOn(earlier, later, "desc") < 0);
  });
});
