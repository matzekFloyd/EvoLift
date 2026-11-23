import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  deloadEvent,
  placeChartEvents,
  planSwitchEvent,
  sessionChartMarkers,
  weekChartMarkers,
} from "@/lib/chart-event-markers";

const sessions = [
  { date: "2026-01-06", x: "Jan 6" },
  { date: "2026-01-13", x: "Jan 13" },
  { date: "2026-01-20", x: "Jan 20" },
];

describe("placeChartEvents", () => {
  it("marks the session on the day a plan was activated", () => {
    const markers = placeChartEvents(sessions, [planSwitchEvent("2026-01-13", "Upper Power")]);
    assert.deepEqual(markers, [
      {
        x: "Jan 13",
        labels: ["Plan: Upper Power"],
        chartLabel: "Plan: Upper Power",
        kinds: ["plan-switch"],
      },
    ]);
  });

  it("marks the next session when the switch falls between sessions", () => {
    const markers = sessionChartMarkers(
      [
        { performedOn: "2026-01-06", xTickLabel: "Jan 6" },
        { performedOn: "2026-01-20", xTickLabel: "Jan 20" },
      ],
      [planSwitchEvent("2026-01-10", "Lower Strength")],
    );
    assert.equal(markers[0]?.x, "Jan 20");
    assert.deepEqual(markers[0]?.labels, ["Plan: Lower Strength"]);
  });

  it("leaves switches outside the plotted sessions off the chart", () => {
    const markers = placeChartEvents(sessions, [
      planSwitchEvent("2026-01-01", "Before"),
      planSwitchEvent("2026-02-01", "After"),
    ]);
    assert.deepEqual(markers, []);
  });

  it("joins a plan switch and a deload that land on the same session", () => {
    const markers = placeChartEvents(sessions, [
      deloadEvent("2026-01-13"),
      planSwitchEvent("2026-01-13", "Push Focus"),
    ]);
    assert.equal(markers.length, 1);
    assert.deepEqual(markers[0]?.labels, ["Deload", "Plan: Push Focus"]);
    assert.deepEqual(markers[0]?.kinds, ["deload", "plan-switch"]);
  });

  it("shortens a long on-chart label and keeps the full text", () => {
    const markers = placeChartEvents(sessions, [
      planSwitchEvent("2026-01-06", "Very Long Hypertrophy Block"),
    ]);
    assert.equal(markers[0]?.labels[0], "Plan: Very Long Hypertrophy Block");
    assert.equal(markers[0]?.chartLabel.endsWith("…"), true);
    assert.ok((markers[0]?.chartLabel.length ?? 0) <= 22);
  });

  it("marks the week that contains a plan switch", () => {
    const markers = weekChartMarkers(
      [{ weekStart: "2026-01-05" }, { weekStart: "2026-01-12" }],
      [planSwitchEvent("2026-01-07", "Upper Power")],
    );
    assert.equal(markers[0]?.x, "2026-01-05");
    assert.deepEqual(markers[0]?.kinds, ["plan-switch"]);
  });

  it("marks a deload on the week that contains it", () => {
    const markers = weekChartMarkers(
      [{ weekStart: "2026-01-05" }, { weekStart: "2026-01-12" }],
      [deloadEvent("2026-01-14")],
    );
    assert.equal(markers[0]?.x, "2026-01-12");
    assert.deepEqual(markers[0]?.labels, ["Deload"]);
  });
});
