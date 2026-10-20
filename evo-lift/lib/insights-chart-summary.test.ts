import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildInsightsComparisonSentence } from "./insights-chart-summary";
import type { WeeklyVolumePoint } from "./insights-data";

function week(weekStart: string, volumeKg: number, workingSets: number): WeeklyVolumePoint {
  return { weekStart, volumeKg, workingSets, sessionCount: 1 };
}

describe("buildInsightsComparisonSentence", () => {
  it("returns nothing when the selected range has no weeks", () => {
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: [],
        allWeeks: [],
        dateFrom: "2026-09-01",
        dateTo: "2026-09-14",
        periodName: "2 weeks",
      }),
      "",
    );
  });

  it("says when the previous window has no data", () => {
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: [week("2026-09-01", 100, 4), week("2026-09-08", 150, 6)],
        allWeeks: [week("2026-09-01", 100, 4), week("2026-09-08", 150, 6)],
        dateFrom: "2026-09-01",
        dateTo: "2026-09-14",
        periodName: "2 weeks",
      }),
      "250.0 kg in this range. No earlier period to compare.",
    );
  });

  it("compares volume as a percent and working sets as a count", () => {
    const current = [week("2026-09-01", 100, 10), week("2026-09-08", 150, 8)];
    const all = [week("2026-08-25", 100, 10), ...current];
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: current,
        allWeeks: all,
        dateFrom: "2026-09-01",
        dateTo: "2026-09-14",
        periodName: "2 weeks",
      }),
      "250.0 kg in this range, 150% more than the previous 2 weeks.",
    );
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "workingSets",
        currentWeeks: current,
        allWeeks: all,
        dateFrom: "2026-09-01",
        dateTo: "2026-09-14",
        periodName: null,
      }),
      "18 working sets in this range, 8 more working sets than the previous period.",
    );
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "sessions",
        currentWeeks: current.map((point) => ({ ...point, sessionCount: 3 })),
        allWeeks: all.map((point) => ({ ...point, sessionCount: 2 })),
        dateFrom: "2026-09-01",
        dateTo: "2026-09-14",
        periodName: "2 weeks",
      }),
      "6 sessions in this range, 4 more sessions than the previous 2 weeks.",
    );
  });

  it("compares the latest week with the week before when the range is open", () => {
    assert.equal(
      buildInsightsComparisonSentence({
        metric: "volume",
        currentWeeks: [week("2026-09-08", 100, 4)],
        allWeeks: [week("2026-09-08", 100, 4)],
        dateFrom: "",
        dateTo: "",
        periodName: null,
      }),
      "Latest week is 100.0 kg. No earlier week to compare.",
    );
  });
});
