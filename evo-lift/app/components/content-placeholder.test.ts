import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  ACCOUNT_PLACEHOLDER_ROWS,
  API_TOKEN_PLACEHOLDER_ROWS,
  CONTENT_PLACEHOLDER_ROW_CLASS,
  CONTENT_PLACEHOLDER_SURFACE_CLASS,
  EXERCISE_CHART_HEIGHT_CLASS,
  EXERCISE_HISTORY_PLACEHOLDER_ROWS,
  EXERCISE_LIST_PLACEHOLDER_CLASS,
  INSIGHTS_KPI_PLACEHOLDER_COUNT,
  INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS,
  NAMED_LIST_PLACEHOLDER_ROWS,
  contentPlaceholderIndexes,
} from "./content-placeholder-layout";

const componentsDir = dirname(fileURLToPath(import.meta.url));

describe("content placeholder", () => {
  it("builds a short run of bars and ignores an empty count", () => {
    assert.deepEqual(contentPlaceholderIndexes(0), []);
    assert.deepEqual(contentPlaceholderIndexes(-2), []);
    assert.equal(contentPlaceholderIndexes(NAMED_LIST_PLACEHOLDER_ROWS).length, 6);
    assert.ok(NAMED_LIST_PLACEHOLDER_ROWS < 20);
    assert.equal(API_TOKEN_PLACEHOLDER_ROWS, 2);
    assert.equal(EXERCISE_HISTORY_PLACEHOLDER_ROWS, 8);
    assert.equal(ACCOUNT_PLACEHOLDER_ROWS, 4);
    assert.match(CONTENT_PLACEHOLDER_ROW_CLASS, /h-10/);
    assert.match(CONTENT_PLACEHOLDER_SURFACE_CLASS, /bg-zinc-50/);
    assert.match(EXERCISE_LIST_PLACEHOLDER_CLASS, /h-96/);
  });

  it("reserves the insights KPI row and the weekly chart height", () => {
    assert.equal(INSIGHTS_KPI_PLACEHOLDER_COUNT, 3);
    assert.equal(INSIGHTS_WEEKLY_CHART_HEIGHT_CLASS, "h-56 sm:h-72");
    const chart = readFileSync(join(componentsDir, "insights-weekly-volume-chart.tsx"), "utf8");
    assert.match(chart, /h-56[\s\S]*sm:h-72/);
  });

  it("reserves exercise charts at the history chart height", () => {
    assert.equal(EXERCISE_CHART_HEIGHT_CLASS, "h-52 sm:h-64");
    const weight = readFileSync(join(componentsDir, "exercise-weight-progress-chart.tsx"), "utf8");
    const e1rm = readFileSync(join(componentsDir, "exercise-session-e1rm-chart.tsx"), "utf8");
    const volume = readFileSync(join(componentsDir, "exercise-session-volume-chart.tsx"), "utf8");
    for (const source of [weight, e1rm, volume]) {
      assert.match(source, /h-52[\s\S]*sm:h-64/);
    }
  });
});
