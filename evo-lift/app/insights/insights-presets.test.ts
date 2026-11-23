import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getDefaultDateRange } from "@/lib/session-date";
import { insightsMarkedRange } from "./insights-range";
import {
  getInsightsPresetRange,
  insightsLevelDetailsHref,
  insightsLevelWindow,
  insightsLevelDetailsRequested,
  insightsOpeningDates,
  insightsOpeningRange,
} from "./insights-presets";

const today = new Date(2026, 9, 14);

describe("getInsightsPresetRange", () => {
  it("uses 4 weeks, 12 weeks, and 6 months back from today", () => {
    assert.deepEqual(getInsightsPresetRange("4w", today), { from: "2026-09-17", to: "2026-10-14" });
    assert.deepEqual(getInsightsPresetRange("12w", today), getDefaultDateRange(today));
    assert.deepEqual(getInsightsPresetRange("12w", today), { from: "2026-07-23", to: "2026-10-14" });
    assert.deepEqual(getInsightsPresetRange("6m", today), { from: "2026-04-14", to: "2026-10-14" });
  });

  it("leaves the start open for all", () => {
    assert.deepEqual(getInsightsPresetRange("all", today), { from: "", to: "2026-10-14" });
  });

  it("opens level details on the last 8 weeks without a preset", () => {
    assert.deepEqual(insightsLevelWindow("2026-10-14"), { from: "2026-08-19", to: "2026-10-14" });
    assert.equal(
      insightsLevelDetailsHref("2026-10-14"),
      "/app/insights?from=2026-08-19&to=2026-10-14#overall-level",
    );
    assert.equal(insightsMarkedRange("2026-08-19", "2026-10-14", today), null);
    assert.deepEqual(
      insightsOpeningDates({ range: "all", from: "2026-08-19", to: "2026-10-14" }, today),
      { from: "2026-08-19", to: "2026-10-14" },
    );
    assert.deepEqual(insightsOpeningDates({ range: "all", from: null, to: null }, today), {
      from: "",
      to: "2026-10-14",
    });
    assert.deepEqual(insightsOpeningDates({ range: null, from: "2026-13-01", to: "2026-10-14" }, today), {
      from: "2026-07-23",
      to: "2026-10-14",
    });
    assert.equal(insightsLevelDetailsRequested("#overall-level"), true);
    assert.equal(insightsLevelDetailsRequested(""), false);
    assert.equal(insightsLevelDetailsRequested("#exercise-progress"), false);
    assert.equal(insightsOpeningRange("all"), "all");
    assert.equal(insightsOpeningRange(null), "12w");
    assert.equal(insightsOpeningRange("12w"), "12w");
  });
});
