import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { draftFromRow, emptyGoalDraft, type GoalDraftSource } from "./goal-draft";

function source(partial: Partial<GoalDraftSource> = {}): GoalDraftSource {
  return {
    id: "goal-1",
    exercise_id: "ex-1",
    milestone_type: "absolute",
    target_weight_kg: 100,
    bodyweight_multiple: null,
    min_reps: 5,
    due_on: "2026-12-01T00:00:00",
    note: "Keep the bar path tight.",
    ...partial,
  };
}

describe("goal drafts", () => {
  it("starts a new goal as an absolute target with one rep", () => {
    assert.deepEqual(emptyGoalDraft(), {
      id: null,
      exerciseId: "",
      milestoneType: "absolute",
      targetWeightKg: "",
      bodyweightMultiple: "",
      minReps: "1",
      dueOn: "",
      note: "",
    });
  });

  it("maps a saved goal into the editor, including a blank optional field", () => {
    assert.deepEqual(draftFromRow(source()), {
      id: "goal-1",
      exerciseId: "ex-1",
      milestoneType: "absolute",
      targetWeightKg: "100",
      bodyweightMultiple: "",
      minReps: "5",
      dueOn: "2026-12-01",
      note: "Keep the bar path tight.",
    });
    assert.deepEqual(
      draftFromRow(
        source({
          milestone_type: "bodyweight_multiple",
          target_weight_kg: null,
          bodyweight_multiple: 1.25,
          due_on: null,
          note: null,
        }),
      ),
      {
        id: "goal-1",
        exerciseId: "ex-1",
        milestoneType: "bodyweight_multiple",
        targetWeightKg: "",
        bodyweightMultiple: "1.25",
        minReps: "5",
        dueOn: "",
        note: "",
      },
    );
  });
});