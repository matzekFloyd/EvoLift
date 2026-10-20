import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ApiHttpError } from "@/server/api/errors";
import { assertApiUserId, requireOwnedRow } from "./owned";

describe("assertApiUserId", () => {
  it("keeps a non-empty user id", () => {
    assert.equal(assertApiUserId("user-1"), "user-1");
  });

  it("rejects a missing user id", () => {
    assert.throws(() => assertApiUserId(""), (error: unknown) => {
      assert.ok(error instanceof ApiHttpError);
      assert.equal(error.status, 401);
      return true;
    });
  });
});

describe("requireOwnedRow", () => {
  it("returns the id when the row belongs to the user", async () => {
    const client = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: { id: "row-1" }, error: null }),
        };
      },
    };
    const row = await requireOwnedRow(
      client as never,
      "workout_plans",
      "user-1",
      "row-1",
      "Plan not found.",
    );
    assert.deepEqual(row, { id: "row-1" });
  });

  it("hides missing and foreign rows behind the same 404", async () => {
    const client = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
        };
      },
    };
    await assert.rejects(
      () =>
        requireOwnedRow(
          client as never,
          "workout_sessions",
          "user-1",
          "foreign",
          "Workout session not found.",
        ),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.status, 404);
        assert.equal(error.message, "Workout session not found.");
        return true;
      },
    );
  });
});
