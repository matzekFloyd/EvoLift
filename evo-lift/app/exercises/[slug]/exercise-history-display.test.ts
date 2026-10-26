import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseDetailFilterQueryString,
  formatKgValue,
  historyRowSurfaceClass,
  historyRowTitle,
  historyValueClass,
  loggedLoadKg,
  normalizeLoadedForComparison,
  setTotalKgForStats,
  summarizeExerciseHistory,
} from "./exercise-history-display";

const defaults = { from: "2025-10-14", to: "2026-10-14" };

describe("exercise history display", () => {
  it("omits default dates and writes hideWarmups only when warmups are shown", () => {
    assert.equal(buildExerciseDetailFilterQueryString(defaults.from, defaults.to, true, defaults), "");
    assert.equal(
      buildExerciseDetailFilterQueryString("2026-01-01", defaults.to, false, defaults),
      "from=2026-01-01&hideWarmups=0",
    );
  });

  it("treats a missing load as lower than any logged load", () => {
    assert.ok(normalizeLoadedForComparison(null) < normalizeLoadedForComparison(0));
    assert.equal(loggedLoadKg({ weightKg: null }), null);
    assert.equal(loggedLoadKg({ weightKg: Number.NaN }), null);
    assert.equal(loggedLoadKg({ weightKg: 60 }), 60);
  });

  it("counts a set total only when the load was logged", () => {
    assert.equal(setTotalKgForStats({ weightKg: null, totalKg: 80 }), null);
    assert.equal(setTotalKgForStats({ weightKg: 60, totalKg: 80 }), 80);
    assert.equal(formatKgValue(null, 1), "—");
    assert.equal(formatKgValue(80, 1), "80.0 kg");
  });

  it("counts warmups as logged sets and leaves them out of load totals", () => {
    const stats = summarizeExerciseHistory([
      { sessionId: "a", isWarmup: true, weightKg: 40, totalKg: 60 },
      { sessionId: "a", isWarmup: false, weightKg: 100, totalKg: 120 },
      { sessionId: "a", isWarmup: false, weightKg: 80, totalKg: 100 },
      { sessionId: "b", isWarmup: false, weightKg: null, totalKg: 0 },
    ]);
    assert.equal(stats.setCount, 4);
    assert.equal(stats.avgSetsPerSession, 2);
    assert.equal(stats.maxSetsInSession, 3);
    assert.equal(stats.avgLoadedKg, 90);
    assert.equal(stats.bestLoadedKg, 100);
    assert.equal(stats.avgTotalKg, 110);
    assert.equal(stats.bestTotalKg, 120);
  });

  it("uses the lowest assistance, including 0 kg, and keeps the average", () => {
    const rows = [
      { sessionId: "a", isWarmup: true, weightKg: 0, totalKg: 0 },
      { sessionId: "a", isWarmup: false, weightKg: 0, totalKg: 0 },
      { sessionId: "a", isWarmup: false, weightKg: 20, totalKg: 20 },
      { sessionId: "a", isWarmup: false, weightKg: 10, totalKg: 10 },
      { sessionId: "b", isWarmup: false, weightKg: null, totalKg: 0 },
    ];
    const least = summarizeExerciseHistory(rows, { assistance: true });
    assert.equal(least.bestLoadedKg, 0);
    assert.equal(least.avgLoadedKg, 10);
    assert.equal(least.setCount, 5);
    assert.equal(summarizeExerciseHistory(rows).bestLoadedKg, 20);
  });

  it("describes a best set, a reached goal, and a plain set", () => {
    assert.equal(
      historyRowTitle({ goalLabel: "100 kg", isWarmup: false }, true),
      "Best set marker: top reps (with tie-break rules). Goal reached: 100 kg. Open session. Warmup: no.",
    );
    assert.equal(
      historyRowTitle({ goalLabel: null, isWarmup: true }, false),
      "Set details for this exercise entry. Open session. Warmup: yes.",
    );
    assert.match(historyRowSurfaceClass(true, false), /emerald/);
    assert.match(historyRowSurfaceClass(false, true), /sky/);
    assert.equal(historyValueClass(false, false), "");
    assert.match(historyValueClass(false, true), /sky/);
  });
});
