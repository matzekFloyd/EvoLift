import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getInsightsPresetRange } from "./insights-presets";

const today = new Date(2026, 9, 14);

describe("getInsightsPresetRange", () => {
  it("uses 4 weeks, 12 weeks, and 6 months back from today", () => {
    assert.deepEqual(getInsightsPresetRange("4w", today), { from: "2026-09-17", to: "2026-10-14" });
    assert.deepEqual(getInsightsPresetRange("12w", today), { from: "2026-07-23", to: "2026-10-14" });
    assert.deepEqual(getInsightsPresetRange("6m", today), { from: "2026-04-14", to: "2026-10-14" });
  });

  it("leaves the start open for all", () => {
    assert.deepEqual(getInsightsPresetRange("all", today), { from: "", to: "2026-10-14" });
  });
});
