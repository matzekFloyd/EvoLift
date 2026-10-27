import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { getInsightsPresetRange } from "@/app/insights/insights-presets";
import {
  insightsClearFiltersDisabled,
  insightsComparisonPeriodName,
  insightsMarkedRange,
} from "./insights-range";

const today = new Date(2026, 9, 14);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("insights range", () => {
  it("marks the same 4w, 12w, 6m, and All dates as the shared control", () => {
    for (const range of ["4w", "12w", "6m", "all"] as const) {
      const preset = getInsightsPresetRange(range, today);
      assert.equal(insightsMarkedRange(preset.from, preset.to, today), range);
    }
    assert.equal(insightsMarkedRange("2026-01-01", "2026-02-01", today), null);
  });

  it("names a comparison period only for an exact preset window", () => {
    assert.equal(
      insightsComparisonPeriodName(getInsightsPresetRange("4w", today).from, getInsightsPresetRange("4w", today).to, today),
      "4 weeks",
    );
    assert.equal(
      insightsComparisonPeriodName(getInsightsPresetRange("12w", today).from, getInsightsPresetRange("12w", today).to, today),
      "12 weeks",
    );
    assert.equal(
      insightsComparisonPeriodName(getInsightsPresetRange("6m", today).from, getInsightsPresetRange("6m", today).to, today),
      "6 months",
    );
    assert.equal(
      insightsComparisonPeriodName(getInsightsPresetRange("all", today).from, getInsightsPresetRange("all", today).to, today),
      null,
    );
    assert.equal(insightsComparisonPeriodName("2026-01-01", "2026-10-14", today), null);
  });

  it("treats an open window as already cleared", () => {
    assert.equal(insightsClearFiltersDisabled("", "", today), true);
    assert.equal(insightsClearFiltersDisabled("", "2026-10-14", today), true);
    assert.equal(insightsClearFiltersDisabled("2026-07-23", "2026-10-14", today), false);
  });

  it("wires Insights through the shared range control and the date fields", () => {
    const page = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "(shell)", "app", "insights", "page.tsx"),
      "utf8",
    ).replace(/\r\n/g, "\n");
    const fields = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "components", "date-range-fields.tsx"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    assert.match(page, /insightsMarkedRange/);
    assert.match(page, /applyDateRangePreset/);
    assert.match(page, /trailing=/);
    assert.doesNotMatch(page, /selectedRange/);
    assert.doesNotMatch(page, /applyInsightsRange/);
    assert.match(fields, /DateInput/);
    assert.match(fields, /DateRangePresetButtons/);
    assert.match(fields, /flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end/);
    assert.doesNotMatch(fields, /flex-1/);
    assert.doesNotMatch(fields, /ml-auto/);
  });
});
