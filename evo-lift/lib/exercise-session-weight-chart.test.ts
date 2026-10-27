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

  it("plots the least assistance, including 0 kg, and a later set on a tie", () => {
    const points = buildExerciseSessionWeightChartPoints(
      [
        row({ setNumber: 1, weightKg: 20, totalKg: 20 }),
        row({ setNumber: 2, weightKg: 10, totalKg: 10 }),
        row({ setNumber: 3, weightKg: 0, totalKg: 0 }),
        row({ setNumber: 4, weightKg: 0, totalKg: 0 }),
        row({ setNumber: 5, weightKg: 5, totalKg: 5, isWarmup: true }),
      ],
      { assistance: true },
    );
    assert.equal(points.length, 1);
    assert.equal(points[0]?.heaviestSetNumber, 4);
    assert.equal(points[0]?.heaviestLoadedKg, 0);
  });

  it("plots bodyweight minus assistance for the least-assistance set", () => {
    const entries = [
      { loggedOn: "2026-10-01", bodyweightKg: 80 },
      { loggedOn: "2026-10-20", bodyweightKg: 90 },
    ];
    const points = buildExerciseSessionWeightChartPoints(
      [
        row({ performedOn: "2026-10-14", setNumber: 1, weightKg: 20, totalKg: 20 }),
        row({ performedOn: "2026-10-14", setNumber: 2, weightKg: 10, totalKg: 10 }),
        row({ performedOn: "2026-10-14", setNumber: 3, weightKg: 10, totalKg: 10 }),
        row({ performedOn: "2026-10-14", setNumber: 4, weightKg: 5, totalKg: 5, isWarmup: true }),
      ],
      { assistance: true, bodyweightEntries: entries },
    );
    assert.equal(points[0]?.heaviestSetNumber, 3);
    assert.equal(points[0]?.heaviestLoadedKg, 10);
    assert.equal(points[0]?.movedLoadKg, 70);
  });

  it("keeps assistance only when no earlier bodyweight applies", () => {
    const points = buildExerciseSessionWeightChartPoints(
      [
        row({
          sessionId: "before",
          performedOn: "2026-10-01",
          sessionCreatedAt: "2026-10-01T10:00:00Z",
          weightKg: 15,
          totalKg: 15,
        }),
        row({
          sessionId: "after",
          performedOn: "2026-10-14",
          sessionCreatedAt: "2026-10-14T10:00:00Z",
          weightKg: 0,
          totalKg: 0,
        }),
        row({
          sessionId: "too-much-help",
          performedOn: "2026-10-21",
          sessionCreatedAt: "2026-10-21T10:00:00Z",
          weightKg: 85,
          totalKg: 85,
        }),
      ],
      {
        assistance: true,
        bodyweightEntries: [{ loggedOn: "2026-10-14", bodyweightKg: 80 }],
      },
    );
    const bySession = new Map(points.map((point) => [point.sessionId, point.movedLoadKg]));
    assert.equal(bySession.get("before"), null);
    assert.equal(bySession.get("after"), 80);
    assert.equal(bySession.get("too-much-help"), null);
    assert.equal(points.find((point) => point.sessionId === "too-much-help")?.heaviestLoadedKg, 85);
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
    const moreHelp = point({ heaviestLoadedKg: 20, heaviestTotalKg: 20 });
    const lessHelp = point({ heaviestLoadedKg: 10, heaviestTotalKg: 10 });
    assert.equal(
      buildWeightChangeSentence([moreHelp, lessHelp], "loaded", { assistance: true }),
      "Last session: 10.0 kg assistance, 10.0 kg less assistance than the session before.",
    );
    assert.equal(
      buildWeightChangeSentence([lessHelp, moreHelp], "loaded", { assistance: true }),
      "Last session: 20.0 kg assistance, 10.0 kg more assistance than the session before.",
    );
    const withMoved = point({ heaviestLoadedKg: 10, movedLoadKg: 70 });
    assert.equal(
      buildWeightChangeSentence([withMoved], "loaded", { assistance: true }),
      "Last session: 10.0 kg assistance and 70.0 kg bodyweight minus assistance. Log another session to see the change.",
    );
    const previousMoved = point({ heaviestLoadedKg: 20, movedLoadKg: 60 });
    assert.equal(
      buildWeightChangeSentence([previousMoved, withMoved], "loaded", { assistance: true }),
      "Last session: 10.0 kg assistance, 10.0 kg less assistance than the session before, and 70.0 kg bodyweight minus assistance, 10.0 kg more than the session before.",
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
