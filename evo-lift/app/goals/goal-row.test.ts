import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { definitionFromRow, storedFromRow, type GoalProgressSource } from "./goal-row";

function source(partial: Partial<GoalProgressSource> = {}): GoalProgressSource {
  return {
    exercise_id: "ex-1",
    milestone_type: "absolute",
    target_weight_kg: 100,
    bodyweight_multiple: null,
    min_reps: 5,
    achieved_at: null,
    achieved_bodyweight_kg: null,
    achieved_threshold_kg: null,
    ...partial,
  };
}

describe("goal rows", () => {
  it("maps a saved goal into the progress definition", () => {
    assert.deepEqual(definitionFromRow(source()), {
      exerciseId: "ex-1",
      milestoneType: "absolute",
      targetWeightKg: 100,
      bodyweightMultiple: null,
      minReps: 5,
    });
  });

  it("keeps a missing achievement blank and rounds a stored bodyweight", () => {
    assert.deepEqual(
      storedFromRow(
        source({
          milestone_type: "bodyweight_multiple",
          achieved_at: "2026-10-01T12:00:00.000Z",
          achieved_bodyweight_kg: 80.126,
          achieved_threshold_kg: 100.2,
        }),
      ),
      {
        achievedAt: "2026-10-01T12:00:00.000Z",
        achievedBodyweightKg: 80.13,
        achievedThresholdKg: 100.2,
      },
    );
  });
});
