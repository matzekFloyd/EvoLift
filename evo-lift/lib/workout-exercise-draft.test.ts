import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createEmptyExerciseRow, exerciseDraftRowsFromTemplateLines } from "./workout-exercise-draft";

function line(
  position: number,
  overrides: Partial<{
    exercise_id: string;
    base_weight_kg: number | null;
    target_sets: number | null;
    target_reps: number | null;
    target_weight_kg: number | null;
    notes: string | null;
  }> = {},
) {
  return {
    exercise_id: "ex-1",
    position,
    base_weight_kg: 20,
    target_sets: 3,
    target_reps: 8,
    target_weight_kg: 60,
    notes: "pause",
    ...overrides,
  };
}

describe("workout exercise drafts", () => {
  it("starts a row with empty fields and a unique id", () => {
    const first = createEmptyExerciseRow();
    const second = createEmptyExerciseRow();
    assert.notEqual(first.rowId, second.rowId);
    assert.deepEqual(
      { ...first, rowId: "row" },
      {
        rowId: "row",
        exerciseId: "",
        baseWeightKg: "",
        targetSets: "",
        targetReps: "",
        targetWeightKg: "",
        notes: "",
      },
    );
  });

  it("orders template lines and drops targets that are not usable", () => {
    const rows = exerciseDraftRowsFromTemplateLines([
      line(2, { exercise_id: "later", notes: "   ", target_sets: 0, target_reps: 0 }),
      line(1, { exercise_id: "earlier", base_weight_kg: null, target_weight_kg: Number.NaN }),
    ]);
    assert.equal(rows[0]?.exerciseId, "earlier");
    assert.equal(rows[0]?.baseWeightKg, "");
    assert.equal(rows[0]?.targetWeightKg, "");
    assert.equal(rows[0]?.targetSets, "3");
    assert.equal(rows[1]?.exerciseId, "later");
    assert.equal(rows[1]?.targetSets, "");
    assert.equal(rows[1]?.targetReps, "");
    assert.equal(rows[1]?.notes, "");
  });
});
