import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  formatInsightsVolumeKg,
  insightsActivityTotals,
  insightsKpiNote,
  previousInsightsActivityWindow,
} from "./insights-kpi";

describe("insights activity tiles", () => {
  it("groups volume and sums the selected days", () => {
    assert.equal(formatInsightsVolumeKg(221889.5), "221,889.5");
    assert.equal(formatInsightsVolumeKg(12), "12.0");
    assert.deepEqual(
      insightsActivityTotals([
        { date: "2026-11-01", workouts: 1, sets: 10, loadedKg: 1000 },
        { date: "2026-11-08", workouts: 2, sets: 4, loadedKg: 250.5 },
      ]),
      { workouts: 3, sets: 14, volumeKg: 1250.5 },
    );
  });

  it("names the window of the same length before From", () => {
    assert.deepEqual(previousInsightsActivityWindow("2026-08-17", "2026-11-08"), {
      from: "2026-05-25",
      to: "2026-08-16",
    });
    assert.equal(previousInsightsActivityWindow("", "2026-11-08"), null);
    assert.equal(previousInsightsActivityWindow("2026-11-08", "2026-08-17"), null);
  });

  it("compares a tile with the previous period", () => {
    assert.equal(insightsKpiNote(44, 40, "workouts", "12 weeks"), "4 more workouts than the previous 12 weeks");
    assert.equal(insightsKpiNote(1, 2, "sets", null), "1 fewer set than the previous period");
    assert.equal(insightsKpiNote(10, 10, "workouts", "4 weeks"), "Same as the previous 4 weeks");
    assert.equal(insightsKpiNote(110, 100, "volume", "12 weeks"), "10% more than the previous 12 weeks");
    assert.equal(insightsKpiNote(100, 0, "volume", "12 weeks"), "100.0 kg more than the previous 12 weeks");
  });
});
