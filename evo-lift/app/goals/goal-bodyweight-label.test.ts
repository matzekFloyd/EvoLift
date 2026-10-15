import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatGoalBodyweightTarget } from "./goal-bodyweight-label";
import type { GoalProgress, MilestoneDefinition } from "@/lib/milestone-progress";

const multiple: MilestoneDefinition = {
  exerciseId: "squat",
  milestoneType: "bodyweight_multiple",
  targetWeightKg: null,
  bodyweightMultiple: 2,
  minReps: 5,
};

const active: GoalProgress = {
  kind: "active",
  thresholdKg: 166,
  bestTotalKg: null,
  bestReps: null,
  gapKg: 166,
  percent: 0,
  achievedAt: null,
  pastDue: false,
};

describe("goal bodyweight labels", () => {
  it("names the current bodyweight on an open goal", () => {
    assert.equal(
      formatGoalBodyweightTarget({
        definition: multiple,
        progress: active,
        achievedBodyweightKg: null,
        bodyweightEntries: [
          { loggedOn: "2026-10-01", bodyweightKg: 80 },
          { loggedOn: "2026-10-15", bodyweightKg: 83 },
        ],
        today: "2026-10-15",
      }),
      "2.0× bodyweight (is 83 kg)",
    );
  });

  it("keeps the bodyweight from when a goal was reached", () => {
    assert.equal(
      formatGoalBodyweightTarget({
        definition: { ...multiple, bodyweightMultiple: 1 },
        progress: {
          kind: "achieved",
          thresholdKg: 82,
          bestTotalKg: 137.5,
          bestReps: 5,
          gapKg: 0,
          percent: 100,
          achievedAt: "2026-06-29T12:00:00Z",
          pastDue: false,
        },
        achievedBodyweightKg: 82,
        bodyweightEntries: [{ loggedOn: "2026-10-15", bodyweightKg: 83 }],
        today: "2026-10-15",
      }),
      "1.0× bodyweight (was 82 kg)",
    );
  });

  it("leaves the multiple alone when no bodyweight applies", () => {
    assert.equal(
      formatGoalBodyweightTarget({
        definition: multiple,
        progress: { kind: "missing_bodyweight", pastDue: false },
        achievedBodyweightKg: null,
        bodyweightEntries: [],
        today: "2026-10-15",
      }),
      "2.0× bodyweight",
    );
    assert.equal(
      formatGoalBodyweightTarget({
        definition: {
          exerciseId: "squat",
          milestoneType: "absolute",
          targetWeightKg: 100,
          bodyweightMultiple: null,
          minReps: 5,
        },
        progress: active,
        achievedBodyweightKg: null,
        bodyweightEntries: [{ loggedOn: "2026-10-15", bodyweightKg: 83 }],
        today: "2026-10-15",
      }),
      "100 kg × 5 reps",
    );
  });
});
