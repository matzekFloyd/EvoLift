import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ExerciseWorkingSetSample } from "@/lib/insights-data";
import {
  overallLevelHistory,
  overallLevelInfluence,
  overallLevelInfluenceLabel,
  overallLevelProgress,
  overallLevelProgressNote,
  overallLevelSource,
  overallLevelUpMessage,
} from "./overall-level-detail";

function lift(
  slug: string,
  label: string,
  totalKg: number,
  performedOn: string,
): ExerciseWorkingSetSample {
  return {
    exerciseId: `ex-${slug}`,
    slug,
    label,
    sessionId: `${slug}-${performedOn}`,
    performedOn,
    reps: 1,
    loadedKg: totalKg,
    totalKg,
  };
}

describe("overallLevelProgress", () => {
  it("fills from the bottom of the current band toward the next level", () => {
    assert.deepEqual(overallLevelProgress(3, "Intermediate"), { fraction: 0.5, nextLabel: "Advanced" });
    assert.deepEqual(overallLevelProgress(3.5, "Advanced"), { fraction: 0, nextLabel: "Elite" });
    assert.equal(overallLevelProgress(11 / 3, "Advanced").nextLabel, "Elite");
    assert.ok(Math.abs((overallLevelProgress(11 / 3, "Advanced").fraction ?? 0) - (11 / 3 - 3.5)) < 1e-9);
  });

  it("starts under the untrained mark and stops at Elite", () => {
    assert.deepEqual(overallLevelProgress(0, "Under the untrained mark"), {
      fraction: 0,
      nextLabel: "Untrained",
    });
    assert.deepEqual(overallLevelProgress(0.25, "Under the untrained mark"), {
      fraction: 0.5,
      nextLabel: "Untrained",
    });
    assert.deepEqual(overallLevelProgress(5, "Elite"), { fraction: 1, nextLabel: null });
  });

  it("explains the percent and names lifts still short of the next level", () => {
    assert.equal(
      overallLevelProgressNote({
        badge: "Untrained",
        progress: { fraction: 0.83, nextLabel: "Novice" },
        lifts: [
          { slug: "back-squat", label: "Barbell Back Squat", level: "Novice", influence: "pulls-up" },
          { slug: "barbell-bench-press", label: "Barbell Bench Press", level: "Untrained", influence: "matches" },
          { slug: "deadlift", label: "Barbell Deadlift", level: "Under the untrained mark", influence: "holds-back" },
          { slug: "overhead-press", label: "Barbell Overhead Press", level: "Intermediate", influence: "left-out" },
        ],
      }),
      "The percent is how far the average of 3 recent main lifts sits from Untrained toward Novice. Each lift counts the same. Barbell Overhead Press is outside the last 8 weeks, so it is left out. Barbell Bench Press and Barbell Deadlift are still short of Novice.",
    );
    assert.equal(
      overallLevelProgressNote({
        badge: "Elite",
        progress: { fraction: 1, nextLabel: null },
        lifts: [],
      }),
      null,
    );
    assert.equal(
      overallLevelProgressNote({
        badge: "Provisional",
        progress: { fraction: null, nextLabel: null },
        lifts: [],
      }),
      null,
    );
  });
});

describe("overall level lifts and history", () => {
  it("names how a lift sits against the overall level", () => {
    assert.equal(overallLevelInfluence(5, 4), "pulls-up");
    assert.equal(overallLevelInfluence(2, 4), "holds-back");
    assert.equal(overallLevelInfluence(4, 4), "matches");
    assert.equal(overallLevelInfluenceLabel("pulls-up"), null);
    assert.equal(overallLevelInfluenceLabel("holds-back"), null);
    assert.equal(overallLevelInfluenceLabel("matches"), null);
    assert.equal(overallLevelInfluenceLabel("left-out"), "Outside the last 8 weeks");
  });

  it("records a badge change and keeps the same badge as one point", () => {
    const early = [
      lift("back-squat", "Barbell Back Squat", 112.5, "2026-01-04"),
      lift("barbell-bench-press", "Barbell Bench Press", 85, "2026-01-04"),
      lift("deadlift", "Barbell Deadlift", 135, "2026-01-04"),
    ];
    const later = [
      lift("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
      lift("barbell-bench-press", "Barbell Bench Press", 145, "2026-02-01"),
      lift("deadlift", "Barbell Deadlift", 235, "2026-02-01"),
    ];
    const history = overallLevelHistory({
      samples: [...early, ...later],
      sex: "male",
      bodyweightKg: 75,
      bodyweightEntries: [],
      asOf: "2026-03-01",
    });
    assert.deepEqual(
      history.map((point) => point.badge),
      ["Intermediate", "Elite"],
    );
    assert.equal(history[0]?.asOf, "2026-01-04");
    assert.equal(history[1]?.asOf, "2026-02-01");
  });

  it("keeps a recent lighter set when an older best sits outside the window", () => {
    const history = overallLevelHistory({
      samples: [
        lift("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
        lift("barbell-bench-press", "Barbell Bench Press", 70, "2026-02-01"),
        lift("deadlift", "Barbell Deadlift", 185, "2026-02-01"),
        lift("overhead-press", "Barbell Overhead Press", 32.5, "2026-02-01"),
        lift("overhead-press", "Barbell Overhead Press", 80, "2025-06-01"),
      ],
      sex: "male",
      bodyweightKg: 75,
      bodyweightEntries: [],
      asOf: "2026-03-01",
    });
    assert.equal(history.at(-1)?.badge, "Intermediate");
  });

  it("names ExRx as the source", () => {
    assert.equal(overallLevelSource("male"), "ExRx.net standards for men, ages 18–39.");
    assert.equal(overallLevelSource("female"), "ExRx.net standards for women, ages 18–39.");
  });
});

describe("overallLevelUpMessage", () => {
  it("speaks only when the ExRx level goes up", () => {
    assert.equal(overallLevelUpMessage("Intermediate", "Advanced"), "You reached Advanced.");
    assert.equal(overallLevelUpMessage(null, "Novice"), "You reached Novice.");
    assert.equal(overallLevelUpMessage("Provisional", "Intermediate"), "You reached Intermediate.");
    assert.equal(overallLevelUpMessage("Advanced", "Advanced"), null);
    assert.equal(overallLevelUpMessage("Elite", "Advanced"), null);
    assert.equal(overallLevelUpMessage("Novice", "Provisional"), null);
    assert.equal(overallLevelUpMessage("Novice", null), null);
  });
});
