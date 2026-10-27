import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseSessionVolumeChartPoints,
  buildVolumeChangeSentence,
  type ExerciseSessionVolumeChartPoint,
  type ExerciseSessionVolumeSetRow,
} from "./exercise-session-volume-chart";

function row(overrides: Partial<ExerciseSessionVolumeSetRow> = {}): ExerciseSessionVolumeSetRow {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    reps: 5,
    weightKg: 60,
    totalKg: 80,
    isWarmup: false,
    ...overrides,
  };
}

function point(
  overrides: Partial<ExerciseSessionVolumeChartPoint> = {},
): ExerciseSessionVolumeChartPoint {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    xKey: "2026-10-14T10:00:00Z",
    xTickLabel: "14",
    volumeKg: 400,
    workingSetsIncluded: 1,
    ...overrides,
  };
}

describe("buildExerciseSessionVolumeChartPoints", () => {
  it("sums reps times total for logged working sets", () => {
    const points = buildExerciseSessionVolumeChartPoints([
      row({ reps: 5, totalKg: 80 }),
      row({ reps: 3, totalKg: 80 }),
      row({ reps: 10, totalKg: 50, isWarmup: true }),
      row({ reps: 8, weightKg: null, totalKg: 80 }),
      row({ reps: -1, totalKg: 80 }),
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0]?.volumeKg, 5 * 80 + 3 * 80);
    assert.equal(points[0]?.workingSetsIncluded, 2);
  });

  it("drops a session whose counted volume is zero", () => {
    assert.deepEqual(buildExerciseSessionVolumeChartPoints([row({ reps: 0 })]), []);
  });

  it("sums reps times bodyweight minus assistance and ignores a later bodyweight", () => {
    const points = buildExerciseSessionVolumeChartPoints(
      [
        row({ reps: 5, weightKg: 20, totalKg: 20 }),
        row({ reps: 4, weightKg: 10, totalKg: 10 }),
        row({ reps: 8, weightKg: 0, totalKg: 0, isWarmup: true }),
        row({ reps: 6, weightKg: 90, totalKg: 90 }),
      ],
      {
        assistance: true,
        bodyweightEntries: [
          { loggedOn: "2026-10-01", bodyweightKg: 80 },
          { loggedOn: "2026-10-20", bodyweightKg: 100 },
        ],
      },
    );
    assert.equal(points.length, 1);
    assert.equal(points[0]?.volumeKg, 5 * 60 + 4 * 70);
    assert.equal(points[0]?.workingSetsIncluded, 2);
  });

  it("adds no volume point when no bodyweight is on or before the session", () => {
    const points = buildExerciseSessionVolumeChartPoints(
      [
        row({
          sessionId: "before",
          performedOn: "2026-10-01",
          sessionCreatedAt: "2026-10-01T10:00:00Z",
          reps: 5,
          weightKg: 10,
          totalKg: 10,
        }),
        row({
          sessionId: "on-day",
          performedOn: "2026-10-14",
          sessionCreatedAt: "2026-10-14T10:00:00Z",
          reps: 5,
          weightKg: 10,
          totalKg: 10,
        }),
      ],
      { assistance: true, bodyweightEntries: [{ loggedOn: "2026-10-14", bodyweightKg: 80 }] },
    );
    assert.deepEqual(
      points.map((point) => point.sessionId),
      ["on-day"],
    );
    assert.equal(points[0]?.volumeKg, 5 * 70);
  });
});

describe("buildVolumeChangeSentence", () => {
  it("compares volume and the working-set count with the session before", () => {
    assert.equal(buildVolumeChangeSentence([]), "");
    assert.equal(
      buildVolumeChangeSentence([point({ workingSetsIncluded: 1 })]),
      "Last session volume is 400.0 kg across 1 working set. Log another session to see the change.",
    );
    assert.equal(
      buildVolumeChangeSentence([
        point({ volumeKg: 300, workingSetsIncluded: 3 }),
        point({ volumeKg: 450, workingSetsIncluded: 2 }),
      ]),
      "Last session volume is 450.0 kg, 150.0 kg more than the session before, with 1 fewer working set.",
    );
  });
});
