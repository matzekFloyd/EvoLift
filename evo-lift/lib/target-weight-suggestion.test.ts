import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  LOG_WORKING_SET_MESSAGE,
  NEED_TARGET_REPS_MESSAGE,
  REP_TARGET_MISMATCH_RATIONALE,
  THIN_HISTORY_MESSAGE,
  suggestTargetWeight,
  targetSuggestionsEnabled,
  type TargetWeightHistorySet,
} from "./target-weight-suggestion";

const TODAY = "2026-10-14";

function daysBefore(days: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function historySet(overrides: Partial<TargetWeightHistorySet> = {}): TargetWeightHistorySet {
  return {
    sessionId: "session-a",
    performedOn: daysBefore(7),
    sessionCreatedAt: `${daysBefore(7)}T10:00:00Z`,
    setNumber: 1,
    reps: 8,
    loadedKg: 60,
    isWarmup: false,
    targetWeightKg: 60,
    ...overrides,
  };
}

function suggest(
  sets: TargetWeightHistorySet[],
  plannedReps: number | null = 8,
  excludeSessionId: string | null = null,
) {
  return suggestTargetWeight({ sets, plannedReps, excludeSessionId, today: TODAY });
}

describe("targetSuggestionsEnabled", () => {
  it("stays on unless the account turns it off", () => {
    assert.equal(targetSuggestionsEnabled(undefined), true);
    assert.equal(targetSuggestionsEnabled(true), true);
    assert.equal(targetSuggestionsEnabled(false), false);
  });
});

describe("suggestTargetWeight", () => {
  it("increases by one step when the last two sessions hit the same load", () => {
    const result = suggest([
      historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({ sessionId: "newer", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 62.5,
      rationale: "Last 2 sessions hit 8 reps at 60 kg.",
    });
  });

  it("holds when recent sessions are mixed", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        reps: 8,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        reps: 7,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 60,
      rationale: "Recent sessions were mixed at 60 kg.",
    });
  });

  it("decreases by one step when the last session missed by 2 or more reps", () => {
    const result = suggest([
      historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        reps: 6,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 57.5,
      rationale: "Last session missed 8 reps at 60 kg.",
    });
  });

  it("returns no suggestion when fewer than two sessions qualify", () => {
    const result = suggest([historySet()]);
    assert.deepEqual(result, { status: "message", message: THIN_HISTORY_MESSAGE });
  });

  it("asks for a logged working set when history is empty", () => {
    const result = suggest([]);
    assert.deepEqual(result, { status: "message", message: LOG_WORKING_SET_MESSAGE });
  });

  it("ignores warmups and does not let a heavier warmup set the load", () => {
    const result = suggest([
      historySet({
        sessionId: "warmup-only",
        performedOn: daysBefore(21),
        sessionCreatedAt: `${daysBefore(21)}T10:00:00Z`,
        loadedKg: 100,
        isWarmup: true,
      }),
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        setNumber: 1,
        loadedKg: 100,
        isWarmup: true,
      }),
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        setNumber: 2,
        loadedKg: 60,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
      }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
    }
  });

  it("ignores null loads", () => {
    const result = suggest([
      historySet({
        sessionId: "null-only",
        performedOn: daysBefore(21),
        sessionCreatedAt: `${daysBefore(21)}T10:00:00Z`,
        loadedKg: null,
        reps: 12,
      }),
      historySet({ sessionId: "only-real", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);

    assert.deepEqual(result, { status: "message", message: THIN_HISTORY_MESSAGE });
  });

  it("excludes the session currently being edited", () => {
    const result = suggest(
      [
        historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
        historySet({ sessionId: "newer", performedOn: daysBefore(7), sessionCreatedAt: `${daysBefore(7)}T10:00:00Z` }),
        historySet({
          sessionId: "current",
          performedOn: daysBefore(0),
          sessionCreatedAt: `${daysBefore(0)}T10:00:00Z`,
          loadedKg: 100,
          reps: 1,
          targetWeightKg: 100,
        }),
      ],
      8,
      "current",
    );

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
    }
  });

  it("holds when the planned reps differ from the reference set by more than 2", () => {
    const result = suggest(
      [
        historySet({
          sessionId: "older",
          performedOn: daysBefore(14),
          sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
          reps: 5,
        }),
        historySet({
          sessionId: "newer",
          performedOn: daysBefore(3),
          sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
          reps: 5,
        }),
      ],
      8,
    );

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 60,
      rationale: REP_TARGET_MISMATCH_RATIONALE,
    });
  });

  it("does not decrease for a lighter deload", () => {
    const result = suggest([
      historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        loadedKg: 40,
        reps: 6,
        targetWeightKg: 40,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 60,
      rationale: "Last session was lighter than 60 kg.",
    });
  });

  it("does not suggest more than one step above the heaviest load in the window", () => {
    const result = suggest([
      historySet({
        sessionId: "heavy",
        performedOn: daysBefore(21),
        sessionCreatedAt: `${daysBefore(21)}T10:00:00Z`,
        loadedKg: 80,
        targetWeightKg: 80,
      }),
      historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({ sessionId: "newer", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
      assert.ok(result.weightKg <= 82.5);
    }
  });

  it("floors a decrease at 0 kg", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        loadedKg: 0,
        reps: 6,
        targetWeightKg: 0,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        loadedKg: 0,
        reps: 6,
        targetWeightKg: 0,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 0,
      rationale: "Last session missed 8 reps at 0 kg.",
    });
  });

  it("treats 0 kg as a real load when reps were logged", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        loadedKg: 0,
        targetWeightKg: 0,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        loadedKg: 0,
        targetWeightKg: 0,
      }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 2.5);
    }
  });

  it("ignores sessions older than 8 weeks and keeps a session on the boundary", () => {
    const tooOld = suggest([
      historySet({
        sessionId: "old",
        performedOn: daysBefore(57),
        sessionCreatedAt: `${daysBefore(57)}T10:00:00Z`,
      }),
      historySet({ sessionId: "recent", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);
    assert.deepEqual(tooOld, { status: "message", message: THIN_HISTORY_MESSAGE });

    const onBoundary = suggest([
      historySet({
        sessionId: "boundary",
        performedOn: daysBefore(56),
        sessionCreatedAt: `${daysBefore(56)}T10:00:00Z`,
      }),
      historySet({ sessionId: "recent", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);
    assert.equal(onBoundary.status, "suggestion");
    if (onBoundary.status === "suggestion") {
      assert.equal(onBoundary.weightKg, 62.5);
    }
  });

  it("uses only the last 3 qualifying sessions", () => {
    const result = suggest([
      historySet({
        sessionId: "oldest",
        performedOn: daysBefore(28),
        sessionCreatedAt: `${daysBefore(28)}T10:00:00Z`,
        loadedKg: 100,
        targetWeightKg: 100,
      }),
      historySet({ sessionId: "third", performedOn: daysBefore(21), sessionCreatedAt: `${daysBefore(21)}T10:00:00Z` }),
      historySet({ sessionId: "second", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({ sessionId: "newest", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
    }
  });

  it("breaks a load tie with the later set number", () => {
    const result = suggest([
      historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        setNumber: 1,
        reps: 8,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        setNumber: 2,
        reps: 5,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 60,
      rationale: REP_TARGET_MISMATCH_RATIONALE,
    });
  });

  it("counts a hit from reps when the session stored no target weight", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        targetWeightKg: null,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        targetWeightKg: null,
      }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
    }
  });

  it("does not treat a load far from the stored target as a hit", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        loadedKg: 70,
        targetWeightKg: 60,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        loadedKg: 70,
        targetWeightKg: 60,
      }),
    ]);

    assert.deepEqual(result, {
      status: "suggestion",
      weightKg: 70,
      rationale: "Recent sessions were mixed at 70 kg.",
    });
  });

  it("asks for target reps before suggesting a weight", () => {
    const result = suggest(
      [
        historySet({ sessionId: "older", performedOn: daysBefore(14), sessionCreatedAt: `${daysBefore(14)}T10:00:00Z` }),
        historySet({ sessionId: "newer", performedOn: daysBefore(3), sessionCreatedAt: `${daysBefore(3)}T10:00:00Z` }),
      ],
      null,
    );

    assert.deepEqual(result, { status: "message", message: NEED_TARGET_REPS_MESSAGE });
  });

  it("treats loads within 0.25 kg as the same load", () => {
    const result = suggest([
      historySet({
        sessionId: "older",
        performedOn: daysBefore(14),
        sessionCreatedAt: `${daysBefore(14)}T10:00:00Z`,
        loadedKg: 60,
        targetWeightKg: 60,
      }),
      historySet({
        sessionId: "newer",
        performedOn: daysBefore(3),
        sessionCreatedAt: `${daysBefore(3)}T10:00:00Z`,
        loadedKg: 60.2,
        targetWeightKg: 60.2,
      }),
    ]);

    assert.equal(result.status, "suggestion");
    if (result.status === "suggestion") {
      assert.equal(result.weightKg, 62.5);
    }
  });
});
