import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { overallLevelChartTick, overallLevelHistoryChart } from "./overall-level-history-series";

describe("overallLevelHistoryChart", () => {
  it("plots each badge change on the ExRx ladder", () => {
    const chart = overallLevelHistoryChart([
      { asOf: "2026-01-04", badge: "Intermediate" },
      { asOf: "2026-02-01", badge: "Elite" },
    ]);
    assert.ok(chart);
    assert.deepEqual(
      chart.points.map((point) => point.score),
      [0, 1],
    );
    assert.equal(chart.points[0]?.dateLabel, "Jan 4, 2026");
    assert.equal(chart.points[0]?.xTickLabel, "Jan 4");
    assert.equal(chart.includeYear, false);
    assert.deepEqual(chart.yTicks, [0, 1]);
    assert.deepEqual(chart.yLabels, ["Intermediate", "Elite"]);
    assert.equal(chart.text.caption, "Evolution");
    assert.equal(chart.text.rows[1]?.cells.level, "Elite");
    assert.equal(overallLevelChartTick(chart.yLabels, 0), "Intermediate");
  });

  it("holds the latest level through the range end without another change", () => {
    const chart = overallLevelHistoryChart(
      [
        { asOf: "2026-01-04", badge: "Intermediate" },
        { asOf: "2026-02-01", badge: "Elite" },
      ],
      { through: "2026-03-01" },
    );
    assert.ok(chart);
    assert.equal(chart.points[2]?.hold, true);
    assert.equal(chart.points[2]?.asOf, "2026-03-01");
    assert.equal(chart.points[2]?.badge, "Elite");
    assert.equal(chart.points[2]?.score, chart.points[1]?.score);
    assert.equal(chart.text.rows.length, 2);
    const sameDay = overallLevelHistoryChart(
      [{ asOf: "2026-02-01", badge: "Elite" }],
      { through: "2026-02-01" },
    );
    assert.equal(sameDay?.points.length, 1);
  });

  it("keeps provisional under the ladder and adds the year when the span crosses one", () => {
    const chart = overallLevelHistoryChart([
      { asOf: "2025-12-01", badge: "Provisional" },
      { asOf: "2026-01-20", badge: "Novice" },
    ]);
    assert.ok(chart);
    assert.equal(chart.points[0]?.score, 0);
    assert.equal(chart.points[1]?.score, 1);
    assert.equal(chart.includeYear, true);
    assert.equal(chart.points[1]?.xTickLabel, "Jan 20, 2026");
    assert.deepEqual(chart.yLabels, ["Provisional", "Novice"]);
    assert.equal(overallLevelChartTick(chart.yLabels, 0), "Provisional");
  });

  it("drops a badge that is not a level", () => {
    assert.equal(overallLevelHistoryChart([{ asOf: "2026-01-04", badge: "Unknown" }]), null);
    assert.equal(overallLevelHistoryChart([]), null);
  });
});
