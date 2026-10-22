import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  formatLastSessionSetComparison,
  lastSessionComparisonLine,
  nextWorkingSetOrdinal,
  previousSessionWorkingSets,
  workingSetOrdinal,
  type PreviousSessionSetSource,
} from "./last-session-set-comparison";

function setRow(
  overrides: Partial<PreviousSessionSetSource> & Pick<PreviousSessionSetSource, "sessionId">,
): PreviousSessionSetSource {
  return {
    performedOn: "2026-10-10",
    sessionCreatedAt: "2026-10-10T10:00:00Z",
    setNumber: 1,
    reps: 5,
    loadedKg: 100,
    isWarmup: false,
    ...overrides,
  };
}

describe("previousSessionWorkingSets", () => {
  it("matches working set 2 to the previous session's second working set and skips warmups", () => {
    const previous = previousSessionWorkingSets([
      setRow({ sessionId: "current", performedOn: "2026-10-17", setNumber: 2, loadedKg: 110 }),
      setRow({
        sessionId: "last",
        performedOn: "2026-10-14",
        setNumber: 1,
        loadedKg: 40,
        reps: 8,
        isWarmup: true,
      }),
      setRow({
        sessionId: "last",
        performedOn: "2026-10-14",
        setNumber: 2,
        loadedKg: 40,
        reps: 5,
        isWarmup: true,
      }),
      setRow({ sessionId: "last", performedOn: "2026-10-14", setNumber: 3, loadedKg: 80, reps: 10 }),
      setRow({ sessionId: "last", performedOn: "2026-10-14", setNumber: 4, loadedKg: 80, reps: 8 }),
      setRow({
        sessionId: "older",
        performedOn: "2026-10-07",
        setNumber: 1,
        loadedKg: 70,
        reps: 12,
      }),
    ], "current");

    assert.deepEqual(previous, [
      { loadedKg: 80, reps: 10 },
      { loadedKg: 80, reps: 8 },
    ]);
    assert.equal(
      lastSessionComparisonLine(previous, 2, { assistance: false }),
      "Last session: 80 kg, 8 reps",
    );
  });

  it("keeps set 2 aligned when neither session used a warmup", () => {
    const previous = previousSessionWorkingSets([
      setRow({ sessionId: "last", setNumber: 1, loadedKg: 100, reps: 5 }),
      setRow({ sessionId: "last", setNumber: 2, loadedKg: 100, reps: 4 }),
    ]);

    assert.equal(
      lastSessionComparisonLine(previous, 2, { assistance: false }),
      "Last session: 100 kg, 4 reps",
    );
  });

  it("picks the later session on the same day and leaves a warmup-only session empty", () => {
    const sameDay = previousSessionWorkingSets([
      setRow({
        sessionId: "morning",
        sessionCreatedAt: "2026-10-14T08:00:00Z",
        loadedKg: 60,
        reps: 8,
      }),
      setRow({
        sessionId: "evening",
        sessionCreatedAt: "2026-10-14T18:00:00Z",
        loadedKg: 90,
        reps: 3,
      }),
    ]);
    assert.deepEqual(sameDay, [{ loadedKg: 90, reps: 3 }]);

    const warmupOnly = previousSessionWorkingSets(
      [
        setRow({ sessionId: "last", isWarmup: true, loadedKg: 50 }),
        setRow({ sessionId: "older", performedOn: "2026-10-01", loadedKg: 100, reps: 5 }),
      ],
      null,
    );
    assert.deepEqual(warmupOnly, []);
  });
});

describe("working set ordinals", () => {
  it("counts working sets in log order and ignores warmups", () => {
    const sets = [
      { setNumber: 1, isWarmup: true },
      { setNumber: 2, isWarmup: false },
      { setNumber: 3, isWarmup: false },
    ];
    assert.equal(workingSetOrdinal(sets, 1), null);
    assert.equal(workingSetOrdinal(sets, 2), 1);
    assert.equal(workingSetOrdinal(sets, 3), 2);
    assert.equal(nextWorkingSetOrdinal(sets), 3);
    assert.equal(nextWorkingSetOrdinal([]), 1);
  });
});

describe("last session comparison copy", () => {
  it("shows loaded weight and reps without turning a missing set into zeros", () => {
    const previous = [{ loadedKg: null, reps: 8 }];
    assert.equal(
      formatLastSessionSetComparison(previous[0], { assistance: false }),
      "Last session: - kg, 8 reps",
    );
    assert.equal(
      formatLastSessionSetComparison(previous[0], { assistance: false, labeled: false }),
      "- kg, 8 reps",
    );
    assert.equal(lastSessionComparisonLine(previous, 2, { assistance: false }), null);
    assert.equal(lastSessionComparisonLine([], 1, { assistance: false }), null);
    assert.equal(lastSessionComparisonLine(previous, null, { assistance: false }), null);
  });

  it("uses assistance for assisted exercises, including unassisted bodyweight", () => {
    assert.equal(
      formatLastSessionSetComparison({ loadedKg: 20, reps: 8 }, { assistance: true }),
      "Last session: 20 kg assistance, 8 reps",
    );
    assert.equal(
      formatLastSessionSetComparison({ loadedKg: 0, reps: 1 }, { assistance: true }),
      "Last session: unassisted, 1 rep",
    );
    assert.equal(
      formatLastSessionSetComparison({ loadedKg: null, reps: 5 }, { assistance: true, labeled: false }),
      "unassisted, 5 reps",
    );
  });
});
