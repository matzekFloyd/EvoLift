import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isCompoundExercise } from "./compound-exercise";

describe("isCompoundExercise", () => {
  it("includes the barbell compounds", () => {
    assert.equal(isCompoundExercise("back-squat"), true);
    assert.equal(isCompoundExercise("front-squat"), true);
    assert.equal(isCompoundExercise("deadlift"), true);
    assert.equal(isCompoundExercise("sumo-deadlift"), true);
    assert.equal(isCompoundExercise("trap-bar-deadlift"), true);
    assert.equal(isCompoundExercise("barbell-bench-press"), true);
    assert.equal(isCompoundExercise("barbell-incline-press"), true);
    assert.equal(isCompoundExercise("overhead-press"), true);
    assert.equal(isCompoundExercise("barbell-bent-over-row"), true);
    assert.equal(isCompoundExercise("barbell-romanian-deadlift"), true);
    assert.equal(isCompoundExercise("close-grip-bench-press"), true);
    assert.equal(isCompoundExercise("barbell-hip-thrust"), true);
  });

  it("leaves other exercises out", () => {
    assert.equal(isCompoundExercise("hammer-curl"), false);
    assert.equal(isCompoundExercise("leg-press"), false);
    assert.equal(isCompoundExercise("dumbbell-row"), false);
    assert.equal(isCompoundExercise("dumbbell-romanian-deadlift"), false);
    assert.equal(isCompoundExercise("romanian-deadlift"), false);
    assert.equal(isCompoundExercise(undefined), false);
    assert.equal(isCompoundExercise(null), false);
  });
});
