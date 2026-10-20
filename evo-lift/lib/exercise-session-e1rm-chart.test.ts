import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { estimateEpley1Rm } from "./exercise-progress-insights";
import {
  buildE1rmChangeSentence,
  buildExerciseSessionE1rmChartPoints,
  type ExerciseSessionE1rmChartPoint,
  type ExerciseSessionE1rmSetRow,
} from "./exercise-session-e1rm-chart";

function row(overrides: Partial<ExerciseSessionE1rmSetRow> = {}): ExerciseSessionE1rmSetRow {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    setNumber: 1,
    reps: 5,
    weightKg: 60,
    totalKg: 80,
    isWarmup: false,
    ...overrides,
  };
}

function point(
  overrides: Partial<ExerciseSessionE1rmChartPoint> = {},
): ExerciseSessionE1rmChartPoint {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    xKey: "2026-10-14T10:00:00Z",
    xTickLabel: "14",
    e1rmKg: 100,
    sourceSetNumber: 1,
    sourceReps: 5,
    sourceTotalKg: 80,
    sourceLoadedKg: 60,
    ...overrides,
  };
}

describe("buildExerciseSessionE1rmChartPoints", () => {
  it("keeps the best Epley estimate and ignores warmups, missing load, and high reps", () => {
    const expected = estimateEpley1Rm(100, 3);
    assert.ok(expected != null);
    const points = buildExerciseSessionE1rmChartPoints([
      row({ setNumber: 1, reps: 5, totalKg: 80, weightKg: 60 }),
      row({ setNumber: 2, reps: 3, totalKg: 100, weightKg: 80 }),
      row({ setNumber: 3, reps: 8, totalKg: 90, weightKg: 70, isWarmup: true }),
      row({ setNumber: 4, reps: 13, totalKg: 120, weightKg: 100 }),
      row({ setNumber: 5, reps: 5, totalKg: 80, weightKg: null }),
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0]?.e1rmKg, expected);
    assert.equal(points[0]?.sourceSetNumber, 2);
    assert.equal(points[0]?.sourceReps, 3);
    assert.equal(points[0]?.sourceTotalKg, 100);
  });

  it("breaks equal estimates with higher total, then higher set number", () => {
    const points = buildExerciseSessionE1rmChartPoints([
      row({ setNumber: 1, reps: 5, totalKg: 80, weightKg: 60 }),
      row({ setNumber: 2, reps: 5, totalKg: 80, weightKg: 60 }),
    ]);
    assert.equal(points[0]?.sourceSetNumber, 2);
  });

  it("drops sessions with no qualifying sets", () => {
    assert.deepEqual(
      buildExerciseSessionE1rmChartPoints([row({ reps: 15, totalKg: 100 })]),
      [],
    );
  });
});

describe("buildE1rmChangeSentence", () => {
  it("compares estimated 1RM with the session before", () => {
    assert.equal(buildE1rmChangeSentence([]), "");
    assert.equal(
      buildE1rmChangeSentence([point({ e1rmKg: 100 })]),
      "Last session estimated 1RM is 100.0 kg. Log another session to see the change.",
    );
    assert.equal(
      buildE1rmChangeSentence([point({ e1rmKg: 100 }), point({ e1rmKg: 110 })]),
      "Last session estimated 1RM is 110.0 kg, 10.0 kg more than the session before.",
    );
  });
});
