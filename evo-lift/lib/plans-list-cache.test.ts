import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidatePlansList, loadPlansList, peekPlansList } from "./plans-list-cache";

function plansClient(result: { data: unknown; error: { message: string } | null }) {
  let calls = 0;
  const client = {
    from() {
      calls += 1;
      const builder = {
        select() {
          return builder;
        },
        order() {
          return Promise.resolve(result);
        },
      };
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

describe("plans list cache", () => {
  beforeEach(() => {
    invalidatePlansList();
  });

  it("remembers plans and counts days", async () => {
    const source = plansClient({
      data: [
        {
          id: "plan-1",
          name: "Strength",
          is_active: true,
          workout_plan_days: [{ id: "d1" }, { id: "d2" }],
        },
        { id: "plan-2", name: "Empty", is_active: false, workout_plan_days: null },
      ],
      error: null,
    });
    const first = await loadPlansList(source.client as never, "user-1");
    const second = await loadPlansList(source.client as never, "user-1");
    assert.equal(source.calls, 1);
    assert.equal(first.error, null);
    assert.deepEqual(second.rows, first.rows);
    assert.equal(peekPlansList("user-1")?.[0]?.dayCount, 2);
    assert.equal(peekPlansList("user-1")?.[1]?.dayCount, 0);
    assert.equal(peekPlansList("user-2"), null);
  });

  it("loads again after the list is dropped", async () => {
    const source = plansClient({ data: [], error: null });
    await loadPlansList(source.client as never, "user-1");
    invalidatePlansList();
    await loadPlansList(source.client as never, "user-1", { fresh: true });
    assert.equal(source.calls, 2);
  });

  it("returns the plans load error", async () => {
    const source = plansClient({ data: null, error: { message: "down" } });
    assert.deepEqual(await loadPlansList(source.client as never, "user-1"), {
      rows: [],
      error: "Could not load plans.",
    });
  });
});
