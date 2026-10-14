import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WARMUP_TARGET_MISSING_MESSAGE,
  filterWarmupSteps,
  formatWarmupStep,
  suggestWarmups,
  type WarmupStep,
} from "./warmup-suggestion";

function stepsFor(targetWeightKg: number | null, baseWeightKg?: number | null): WarmupStep[] {
  const result = suggestWarmups({ targetWeightKg, baseWeightKg });
  assert.equal(result.status, "steps");
  if (result.status !== "steps") {
    return [];
  }
  return result.steps;
}

function assertBelowTarget(steps: WarmupStep[], targetWeightKg: number) {
  for (const step of steps) {
    assert.ok(step.loadedKg < targetWeightKg);
    assert.ok(targetWeightKg - step.loadedKg > 2.5);
  }
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1];
    const current = steps[index];
    assert.ok(previous && current);
    assert.ok(current.loadedKg > previous.loadedKg);
    assert.ok(current.reps < previous.reps);
  }
}

describe("suggestWarmups", () => {
  it("suggests one step under 20 kg when 60% clears the filters", () => {
    assert.deepEqual(stepsFor(15), [{ loadedKg: 10, reps: 5 }]);
    assert.deepEqual(stepsFor(10), [{ loadedKg: 5, reps: 5 }]);
  });

  it("suggests 50% and 75% from 20 kg up to 40 kg", () => {
    assert.deepEqual(stepsFor(20), [
      { loadedKg: 10, reps: 5 },
      { loadedKg: 15, reps: 3 },
    ]);
    assert.deepEqual(stepsFor(30), [
      { loadedKg: 15, reps: 5 },
      { loadedKg: 22.5, reps: 3 },
    ]);
  });

  it("suggests 40%, 60%, and 80% from 40 kg up to 80 kg, including a 50 kg target", () => {
    assert.deepEqual(stepsFor(50), [
      { loadedKg: 20, reps: 8 },
      { loadedKg: 30, reps: 5 },
      { loadedKg: 40, reps: 3 },
    ]);
    assert.deepEqual(
      stepsFor(50).map((step) => formatWarmupStep(step)),
      ["20 kg × 8 reps", "30 kg × 5 reps", "40 kg × 3 reps"],
    );
    assert.deepEqual(stepsFor(40), [
      { loadedKg: 15, reps: 8 },
      { loadedKg: 25, reps: 5 },
      { loadedKg: 32.5, reps: 3 },
    ]);
    assertBelowTarget(stepsFor(50), 50);
  });

  it("suggests 40%, 55%, 70%, and 85% at 80 kg and above", () => {
    assert.deepEqual(stepsFor(80), [
      { loadedKg: 32.5, reps: 8 },
      { loadedKg: 45, reps: 5 },
      { loadedKg: 55, reps: 3 },
      { loadedKg: 67.5, reps: 2 },
    ]);
    assert.deepEqual(stepsFor(100), [
      { loadedKg: 40, reps: 8 },
      { loadedKg: 55, reps: 5 },
      { loadedKg: 70, reps: 3 },
      { loadedKg: 85, reps: 2 },
    ]);
    assertBelowTarget(stepsFor(80), 80);
    assertBelowTarget(stepsFor(100), 100);
  });

  it("drops a step that rounds to within 2.5 kg of the target", () => {
    assert.deepEqual(stepsFor(7.5), []);
    assert.deepEqual(
      filterWarmupSteps(
        [
          { loadKg: 20, reps: 8 },
          { loadKg: 48, reps: 2 },
        ],
        50,
      ),
      [{ loadedKg: 20, reps: 8 }],
    );
  });

  it("drops a step at or above the target", () => {
    assert.deepEqual(stepsFor(2.5), []);
    assert.deepEqual(stepsFor(2.25), []);
    assert.deepEqual(
      filterWarmupSteps(
        [
          { loadKg: 20, reps: 8 },
          { loadKg: 49.6, reps: 2 },
        ],
        50,
      ),
      [{ loadedKg: 20, reps: 8 }],
    );
  });

  it("keeps one step when rounding collapses two loads onto the same plate", () => {
    assert.deepEqual(
      filterWarmupSteps(
        [
          { loadKg: 19, reps: 8 },
          { loadKg: 21, reps: 5 },
          { loadKg: 30, reps: 3 },
        ],
        60,
      ),
      [
        { loadedKg: 20, reps: 8 },
        { loadedKg: 30, reps: 3 },
      ],
    );
  });

  it("asks for a target weight when the target is missing or zero", () => {
    for (const targetWeightKg of [null, 0, -10, Number.NaN]) {
      assert.deepEqual(suggestWarmups({ targetWeightKg }), {
        status: "message",
        message: WARMUP_TARGET_MISSING_MESSAGE,
      });
    }
    assert.equal(WARMUP_TARGET_MISSING_MESSAGE, "Set a target weight to suggest warmups.");
  });

  it("ignores base weight", () => {
    const withoutBase = stepsFor(50);
    assert.deepEqual(stepsFor(50, 20), withoutBase);
    assert.deepEqual(stepsFor(50, 15), withoutBase);
    assert.deepEqual(withoutBase[0], { loadedKg: 20, reps: 8 });
  });
});
