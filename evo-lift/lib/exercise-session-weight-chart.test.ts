import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseSessionWeightChartPoints,
  buildWeightChangeSentence,
  zoomedWeightAxisDomain,
  type ExerciseSessionWeightChartPoint,
  type ExerciseSessionWeightSetRow,
} from "./exercise-session-weight-chart";

function row(overrides: Partial<ExerciseSessionWeightSetRow> = {}): ExerciseSessionWeightSetRow {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    setNumber: 1,
    weightKg: 60,
    totalKg: 80,
    isWarmup: false,
    ...overrides,
  };
}

function point(
  overrides: Partial<ExerciseSessionWeightChartPoint> = {},
): ExerciseSessionWeightChartPoint {
  return {
    sessionId: "s1",
    performedOn: "2026-10-14",
    sessionCreatedAt: "2026-10-14T10:00:00Z",
    xKey: "2026-10-14T10:00:00Z",
    xTickLabel: "14",
    heaviestTotalKg: 80,
    heaviestLoadedKg: 60,
    baseKg: 20,
    heaviestSetNumber: 1,
    ...overrides,
  };
}

describe("buildExerciseSessionWeightChartPoints", () => {
  it("keeps the heaviest working set and ignores warmups and missing loads", () => {
    const points = buildExerciseSessionWeightChartPoints([
      row({ setNumber: 1, totalKg: 80, weightKg: 60 }),
      row({ setNumber: 2, totalKg: 80, weightKg: 70 }),
      row({ setNumber: 3, totalKg: 100, weightKg: 40, isWarmup: true }),
      row({ setNumber: 4, totalKg: 120, weightKg: null }),
      row({ setNumber: 5, totalKg: 90, weightKg: Number.NaN }),
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0]?.heaviestSetNumber, 2);
    assert.equal(points[0]?.heaviestLoadedKg, 70);
    assert.equal(points[0]?.heaviestTotalKg, 80);
    assert.equal(points[0]?.baseKg, 10);
  });

  it("orders sessions by day and numbers a second session on the same day", () => {
    const points = buildExerciseSessionWeightChartPoints([
      row({
        sessionId: "later",
        performedOn: "2026-10-14",
        sessionCreatedAt: "2026-10-14T18:00:00Z",
      }),
      row({
        sessionId: "earlier-day",
        performedOn: "2026-10-07",
        sessionCreatedAt: "2026-10-07T10:00:00Z",
      }),
      row({
        sessionId: "earlier-same-day",
        performedOn: "2026-10-14",
        sessionCreatedAt: "2026-10-14T08:00:00Z",
      }),
    ]);
    assert.deepEqual(
      points.map((item) => item.sessionId),
      ["earlier-day", "earlier-same-day", "later"],
    );
    assert.match(points[1]?.xTickLabel ?? "", /14/);
    assert.equal(points[1]?.xTickLabel.includes("("), false);
    assert.match(points[2]?.xTickLabel ?? "", /\(2\)/);
  });
});

describe("weight chart copy and axis", () => {
  it("describes the last session and the change from the one before", () => {
    assert.equal(buildWeightChangeSentence([], "total"), "");
    assert.equal(
      buildWeightChangeSentence([point()], "loaded"),
      "Last session: 60.0 kg loaded. Log another session to see the change.",
    );
    assert.match(buildWeightChangeSentence([point()], "both"), /60\.0 kg loaded and 80\.0 kg total/);
    const previous = point({ heaviestLoadedKg: 60, heaviestTotalKg: 80 });
    const same = point({ heaviestLoadedKg: 60.02, heaviestTotalKg: 80 });
    assert.match(buildWeightChangeSentence([previous, same], "total"), /the same as the session before/);
    const heavier = point({ heaviestLoadedKg: 65, heaviestTotalKg: 85 });
    assert.equal(
      buildWeightChangeSentence([previous, heavier], "loaded"),
      "Last session: 65.0 kg loaded, 5.0 kg more than the session before.",
    );
    assert.equal(
      buildWeightChangeSentence([point()], "loaded", { assistance: true }),
      "Last session: 60.0 kg assistance. Log another session to see the change.",
    );
  });

  it("pads the axis around the plotted weights", () => {
    assert.deepEqual(zoomedWeightAxisDomain([]), [0, 1]);
    assert.deepEqual(zoomedWeightAxisDomain([Number.NaN]), [0, 1]);
    const [low, high] = zoomedWeightAxisDomain([60, 62.5]);
    assert.ok(low >= 0);
    assert.ok(low < 60);
    assert.ok(high > 62.5);
  });
});
