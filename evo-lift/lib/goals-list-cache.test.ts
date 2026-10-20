import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidateExerciseMetadataCache } from "./exercise-metadata-cache";
import { loadGoalsList, peekGoalsList, resetGoalsListCacheForTests } from "./goals-list-cache";

function tableClient(tables: Record<string, { data: unknown; error: { message: string } | null }>) {
  let calls = 0;
  const client = {
    from(table: string) {
      calls += 1;
      const result = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "in"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      return builder;
    },
  };
  return {
    client,
    get calls() {
      return calls;
    },
  };
}

describe("goals list cache", () => {
  beforeEach(() => {
    resetGoalsListCacheForTests();
    invalidateExerciseMetadataCache();
  });

  it("remembers an empty goal list and the exercise names", async () => {
    const source = tableClient({
      strength_milestones: { data: [], error: null },
      user_bodyweight_log: {
        data: [{ logged_on: "2026-01-02", bodyweight_kg: 80 }, { logged_on: "2026-01-01", bodyweight_kg: 0 }],
        error: null,
      },
      exercises: { data: [{ id: "ex-1", slug: "deadlift" }], error: null },
      exercise_translations: { data: [{ exercise_id: "ex-1", name: "Deadlift" }], error: null },
      user_hidden_exercises: { data: [{ exercise_id: "ex-1" }], error: null },
    });
    const first = await loadGoalsList(source.client as never, "user-1");
    const second = await loadGoalsList(source.client as never, "user-1");
    assert.equal(first.error, null);
    assert.equal(second.snapshot, first.snapshot);
    assert.equal(peekGoalsList("user-1")?.exerciseOptions[0]?.label, "Deadlift");
    assert.deepEqual(peekGoalsList("user-1")?.hiddenExerciseIds, ["ex-1"]);
    assert.deepEqual(peekGoalsList("user-1")?.bodyweightEntries, [{ loggedOn: "2026-01-02", bodyweightKg: 80 }]);
    assert.ok(source.calls < 10);
  });

  it("returns the goals load error", async () => {
    const source = tableClient({
      strength_milestones: { data: null, error: { message: "down" } },
      user_bodyweight_log: { data: [], error: null },
      exercises: { data: [], error: null },
      exercise_translations: { data: [], error: null },
      user_hidden_exercises: { data: [], error: null },
    });
    assert.equal((await loadGoalsList(source.client as never, "user-1")).error, "Could not load goals.");
  });
});
