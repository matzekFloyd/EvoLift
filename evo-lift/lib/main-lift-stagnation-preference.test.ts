import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { DEFAULT_MAIN_LIFT_STAGNATION_WEEKS } from "./main-lift-stagnation";
import {
  invalidateMainLiftStagnationWeeks,
  loadMainLiftStagnationWeeks,
} from "./main-lift-stagnation-preference";

function preferenceClient(input: {
  userId?: string | null;
  row?: { main_lift_stagnation_weeks: number } | null;
  error?: { message: string } | null;
  reads?: { count: number };
}) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: input.userId ? { id: input.userId } : null },
          error: null,
        }),
    },
    from(table: string) {
      assert.equal(table, "app_users");
      if (input.reads) {
        input.reads.count += 1;
      }
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "maybeSingle"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve({
          data: input.row ?? null,
          error: input.error ?? null,
        }).then(onFulfilled);
      return builder;
    },
  };
}

describe("loadMainLiftStagnationWeeks", () => {
  beforeEach(() => {
    invalidateMainLiftStagnationWeeks();
  });

  it("uses the default when signed out, missing, or unreadable", async () => {
    assert.equal(
      await loadMainLiftStagnationWeeks(preferenceClient({ userId: null }) as never),
      DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
    );
    invalidateMainLiftStagnationWeeks();
    assert.equal(
      await loadMainLiftStagnationWeeks(preferenceClient({ userId: "user-1", row: null }) as never),
      DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
    );
    invalidateMainLiftStagnationWeeks();
    assert.equal(
      await loadMainLiftStagnationWeeks(
        preferenceClient({ userId: "user-1", error: { message: "down" } }) as never,
      ),
      DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
    );
  });

  it("returns the saved weeks and reads once until invalidated", async () => {
    const reads = { count: 0 };
    const client = preferenceClient({
      userId: "user-1",
      row: { main_lift_stagnation_weeks: 8 },
      reads,
    });
    assert.equal(await loadMainLiftStagnationWeeks(client as never), 8);
    assert.equal(await loadMainLiftStagnationWeeks(client as never), 8);
    assert.equal(reads.count, 1);
    invalidateMainLiftStagnationWeeks();
    assert.equal(await loadMainLiftStagnationWeeks(client as never), 8);
    assert.equal(reads.count, 2);
  });
});
