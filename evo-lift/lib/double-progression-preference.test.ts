import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import {
  invalidateDoubleProgressionPreference,
  loadDoubleProgressionPreference,
} from "./double-progression-preference";

function preferenceClient(input: {
  userId?: string | null;
  row?: { double_progression: boolean } | null;
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

describe("loadDoubleProgressionPreference", () => {
  beforeEach(() => {
    invalidateDoubleProgressionPreference();
  });

  it("stays off when the account row is missing or the switch is off", async () => {
    const missing = await loadDoubleProgressionPreference(
      preferenceClient({ userId: "user-1", row: null }) as never,
    );
    assert.equal(missing, false);

    invalidateDoubleProgressionPreference();
    const off = await loadDoubleProgressionPreference(
      preferenceClient({ userId: "user-1", row: { double_progression: false } }) as never,
    );
    assert.equal(off, false);
  });

  it("turns on only when the account switch is saved on", async () => {
    const enabled = await loadDoubleProgressionPreference(
      preferenceClient({ userId: "user-1", row: { double_progression: true } }) as never,
    );
    assert.equal(enabled, true);
  });

  it("stays off when the account row cannot be read", async () => {
    const enabled = await loadDoubleProgressionPreference(
      preferenceClient({
        userId: "user-1",
        error: { message: "down" },
      }) as never,
    );
    assert.equal(enabled, false);
  });

  it("reuses the loaded value until it is invalidated", async () => {
    const reads = { count: 0 };
    const client = preferenceClient({
      userId: "user-1",
      row: { double_progression: true },
      reads,
    });
    assert.equal(await loadDoubleProgressionPreference(client as never), true);
    assert.equal(await loadDoubleProgressionPreference(client as never), true);
    assert.equal(reads.count, 1);

    invalidateDoubleProgressionPreference();
    assert.equal(await loadDoubleProgressionPreference(client as never), true);
    assert.equal(reads.count, 2);
  });
});
