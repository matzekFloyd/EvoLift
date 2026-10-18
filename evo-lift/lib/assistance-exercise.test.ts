import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  externalLoadFieldLabel,
  externalLoadValuePrefix,
  isAssistanceExercise,
  targetWeightFieldLabel,
} from "./assistance-exercise";

describe("assistance exercises", () => {
  it("covers assisted dip and assisted pull-up only", () => {
    assert.equal(isAssistanceExercise("assisted-dip"), true);
    assert.equal(isAssistanceExercise("assisted-pull-up"), true);
    assert.equal(isAssistanceExercise("pull-up"), false);
    assert.equal(isAssistanceExercise("chin-up"), false);
    assert.equal(isAssistanceExercise("back-squat"), false);
    assert.equal(isAssistanceExercise(null), false);
  });

  it("uses Assistance copy for assisted moves", () => {
    assert.equal(externalLoadFieldLabel("assisted-dip"), "Assistance (kg)");
    assert.equal(externalLoadFieldLabel("deadlift"), "Loaded (kg)");
    assert.equal(externalLoadValuePrefix("assisted-pull-up"), "Assistance");
    assert.equal(externalLoadValuePrefix("deadlift"), "Loaded");
    assert.equal(targetWeightFieldLabel("assisted-dip"), "Target assistance (kg)");
    assert.equal(targetWeightFieldLabel("deadlift"), "Target weight (kg)");
  });
});
