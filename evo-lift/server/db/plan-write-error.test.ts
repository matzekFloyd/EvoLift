import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { ApiHttpError } from "@/server/api/errors";
import { planWriteFailure } from "./plan-write-error";

describe("planWriteFailure", () => {
  it("returns 401 when the plan save has no user", () => {
    assert.throws(
      () => planWriteFailure({ message: "You must be logged in." }, "Failed to save plan"),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.status, 401);
        assert.equal(error.message, "You must be logged in.");
        return true;
      },
    );
  });

  it("keeps a missing plan at 404 and a name error at 400", () => {
    assert.throws(
      () => planWriteFailure({ message: "Plan not found." }, "Failed to save plan"),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.status, 404);
        return true;
      },
    );
    assert.throws(
      () => planWriteFailure({ message: "Please enter a plan name." }, "Failed to save plan"),
      (error: unknown) => {
        assert.ok(error instanceof ApiHttpError);
        assert.equal(error.status, 400);
        assert.equal(error.message, "Please enter a plan name.");
        return true;
      },
    );
  });
});
