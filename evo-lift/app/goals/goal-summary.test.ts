import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildGoalSummaryBars, type GoalSummaryInput } from "./goal-summary";
import type { GoalProgress } from "@/lib/milestone-progress";

function active(percent: number, pastDue = false): GoalProgress {
  return {
    kind: "active",
    thresholdKg: 100,
    bestTotalKg: percent,
    bestReps: 5,
    gapKg: 100 - percent,
    percent,
    achievedAt: null,
    pastDue,
  };
}

function item(
  id: string,
  label: string,
  targetLabel: string,
  progress: GoalProgress,
): GoalSummaryInput {
  return { id, label, targetLabel, progress };
}

describe("goal summary bars", () => {
  it("orders the fullest bar first and leaves a missing bodyweight last", () => {
    const bars = buildGoalSummaryBars([
      item("squat", "Back Squat", "1.0× bodyweight", active(41.2)),
      item("press", "Overhead Press", "0.8× bodyweight", {
        kind: "missing_bodyweight",
        pastDue: false,
      }),
      item("deadlift", "Deadlift", "2.0× bodyweight", {
        kind: "achieved",
        thresholdKg: 170,
        bestTotalKg: 180,
        bestReps: 3,
        gapKg: 0,
        percent: 100,
        achievedAt: "2026-06-29T12:00:00Z",
        pastDue: false,
      }),
      item("bench", "Barbell Bench Press", "1.0× bodyweight", active(53.6, true)),
    ]);

    assert.deepEqual(
      bars.map((bar) => [bar.label, bar.percent, bar.achieved, bar.pastDue]),
      [
        ["Deadlift", 100, true, false],
        ["Barbell Bench Press", 54, false, true],
        ["Back Squat", 41, false, false],
        ["Overhead Press", null, false, false],
      ],
    );
  });

  it("keeps two goals for one exercise in target order when progress matches", () => {
    const bars = buildGoalSummaryBars([
      item("b", "Back Squat", "2.0× bodyweight", active(0)),
      item("a", "Back Squat", "1.0× bodyweight", active(0)),
    ]);

    assert.deepEqual(
      bars.map((bar) => bar.targetLabel),
      ["1.0× bodyweight", "2.0× bodyweight"],
    );
  });
});
