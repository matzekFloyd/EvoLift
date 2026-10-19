import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { estimateEpley1Rm } from "./exercise-progress-insights";
import type { ExerciseWorkingSetSample } from "./insights-data";
import { buildInsightsCompoundE1rmSeries } from "./insights-compound-e1rm";

function sample(overrides: Partial<ExerciseWorkingSetSample> = {}): ExerciseWorkingSetSample {
  return {
    exerciseId: "ex-squat",
    slug: "back-squat",
    label: "Barbell Back Squat",
    sessionId: "s1",
    performedOn: "2026-01-01",
    reps: 5,
    loadedKg: 100,
    totalKg: 100,
    ...overrides,
  };
}

describe("buildInsightsCompoundE1rmSeries", () => {
  it("builds one series per public-standard compound that has qualifying sets", () => {
    const expected = estimateEpley1Rm(100, 5);
    assert.ok(expected != null);
    const series = buildInsightsCompoundE1rmSeries([
      sample(),
      sample({
        exerciseId: "ex-bench",
        slug: "barbell-bench-press",
        label: "Barbell Bench Press",
        sessionId: "s2",
        performedOn: "2026-01-02",
        totalKg: 80,
        loadedKg: 80,
      }),
      sample({
        exerciseId: "ex-curl",
        slug: "ez-bar-curl",
        label: "EZ-Bar Curl",
        sessionId: "s3",
        totalKg: 40,
        loadedKg: 40,
      }),
    ]);
    assert.deepEqual(
      series.map((item) => item.slug),
      ["back-squat", "barbell-bench-press"],
    );
    assert.equal(series[0]?.shortLabel, "Squat");
    assert.equal(series[0]?.points[0]?.e1rmKg, expected);
  });

  it("omits compounds with only high-rep sets", () => {
    assert.deepEqual(
      buildInsightsCompoundE1rmSeries([sample({ reps: 15 })]),
      [],
    );
  });
});
