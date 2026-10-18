import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { DEFAULT_GOAL_SEEDS } from "./default-goals";

describe("DEFAULT_GOAL_SEEDS", () => {
  it("covers the four ExRx compound lifts with bodyweight multiples", () => {
    assert.deepEqual(
      DEFAULT_GOAL_SEEDS.map((row) => row.slug),
      ["back-squat", "barbell-bench-press", "deadlift", "overhead-press"],
    );
    for (const row of DEFAULT_GOAL_SEEDS) {
      assert.equal(row.minReps, 1);
      assert.ok(row.bodyweightMultiple > 0);
    }
    assert.equal(DEFAULT_GOAL_SEEDS[0]?.bodyweightMultiple, 1.5);
    assert.equal(DEFAULT_GOAL_SEEDS[1]?.bodyweightMultiple, 1.0);
    assert.equal(DEFAULT_GOAL_SEEDS[2]?.bodyweightMultiple, 2.0);
    assert.equal(DEFAULT_GOAL_SEEDS[3]?.bodyweightMultiple, 0.75);
  });
});
