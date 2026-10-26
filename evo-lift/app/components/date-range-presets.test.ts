import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import { fullHistoryClearDateRange } from "@/app/exercises/[slug]/exercise-detail-data";
import {
  applyDateRangePreset,
  dateRangePresetOptions,
  markedDateRangePreset,
  openingDateRange,
  pastWorkoutsAllDateRange,
} from "./date-range-presets";

const today = new Date(2026, 9, 14);

describe("date range presets", () => {
  it("uses the Insights labels", () => {
    assert.deepEqual(
      dateRangePresetOptions.map((option) => option.label),
      ["4w", "12w", "6m", "All"],
    );
  });

  it("opens on the 12-week Insights window", () => {
    assert.deepEqual(openingDateRange(today), getInsightsPresetRange("12w", today));
    assert.deepEqual(openingDateRange(today), { from: "2026-07-23", to: "2026-10-14" });
  });

  it("sets the same 4w, 12w, and 6m dates as Insights", () => {
    for (const range of ["4w", "12w", "6m"] as const) {
      assert.deepEqual(
        applyDateRangePreset(range, today, pastWorkoutsAllDateRange),
        getInsightsPresetRange(range, today),
      );
    }
  });

  it("clears Past workouts to every date and marks only that empty range as All", () => {
    assert.deepEqual(applyDateRangePreset("all", today, pastWorkoutsAllDateRange), {
      from: "",
      to: "",
    });
    assert.equal(markedDateRangePreset("", "", today, pastWorkoutsAllDateRange), "all");
    assert.equal(markedDateRangePreset("", "2026-10-14", today, pastWorkoutsAllDateRange), null);
  });

  it("marks the preset that matches, and a hand-typed range marks none", () => {
    const fourWeeks = getInsightsPresetRange("4w", today);
    const twelveWeeks = getInsightsPresetRange("12w", today);
    const sixMonths = getInsightsPresetRange("6m", today);
    assert.equal(
      markedDateRangePreset(fourWeeks.from, fourWeeks.to, today, pastWorkoutsAllDateRange),
      "4w",
    );
    assert.equal(
      markedDateRangePreset(twelveWeeks.from, twelveWeeks.to, today, pastWorkoutsAllDateRange),
      "12w",
    );
    assert.equal(
      markedDateRangePreset(sixMonths.from, sixMonths.to, today, pastWorkoutsAllDateRange),
      "6m",
    );
    assert.equal(
      markedDateRangePreset("2026-09-01", "2026-10-14", today, pastWorkoutsAllDateRange),
      null,
    );
  });

  it("sets exercise detail All to the earliest set through today, or today when there are no sets", () => {
    const span = fullHistoryClearDateRange(
      [{ performedOn: "2024-02-02" }, { performedOn: "2026-01-01" }],
      "2026-10-14",
    );
    assert.deepEqual(applyDateRangePreset("all", today, span), {
      from: "2024-02-02",
      to: "2026-10-14",
    });
    assert.equal(markedDateRangePreset(span.from, span.to, today, span), "all");

    const empty = fullHistoryClearDateRange([], "2026-10-14");
    assert.deepEqual(applyDateRangePreset("all", today, empty), {
      from: "2026-10-14",
      to: "2026-10-14",
    });
    assert.equal(markedDateRangePreset(empty.from, empty.to, today, empty), "all");
  });

  it("marks 4w when the full span is the same window", () => {
    const fourWeeks = getInsightsPresetRange("4w", today);
    assert.equal(markedDateRangePreset(fourWeeks.from, fourWeeks.to, today, fourWeeks), "4w");
  });
});
