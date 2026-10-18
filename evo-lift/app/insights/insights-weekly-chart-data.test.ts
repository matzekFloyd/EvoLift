import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { withWeeklyMovingAverage } from "./insights-weekly-chart-data";
import type { WeeklyVolumePoint } from "@/lib/insights-data";

function week(weekStart: string, volumeKg: number, workingSets: number): WeeklyVolumePoint {
  return {
    weekStart,
    volumeKg,
    workingSets,
    sessionCount: 1,
  };
}

describe("withWeeklyMovingAverage", () => {
  it("leaves the first three weeks without a moving average", () => {
    const points = [
      week("2026-01-05", 100, 10),
      week("2026-01-12", 200, 20),
      week("2026-01-19", 300, 30),
    ];
    const volume = withWeeklyMovingAverage(points, "volume");
    assert.deepEqual(
      volume.map((row) => row.movingAverage),
      [null, null, null],
    );
  });

  it("averages the selected metric over a four-week window", () => {
    const points = [
      week("2026-01-05", 100, 10),
      week("2026-01-12", 200, 20),
      week("2026-01-19", 300, 30),
      week("2026-01-26", 400, 40),
    ];
    const volume = withWeeklyMovingAverage(points, "volume");
    const sets = withWeeklyMovingAverage(points, "workingSets");
    assert.equal(volume[3]?.movingAverage, 250);
    assert.equal(sets[3]?.movingAverage, 25);
  });
});
