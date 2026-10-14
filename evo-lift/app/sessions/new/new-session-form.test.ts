import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { newSessionCreateError } from "./new-session-form";

const ready = {
  userId: "user-1",
  performedOn: "2026-10-14",
  exerciseRows: [{ exerciseId: "ex-1", baseWeightKg: "" }],
};

describe("new session form", () => {
  it("asks for a date, an exercise, and a valid base weight", () => {
    assert.equal(
      newSessionCreateError({ ...ready, userId: null }),
      "You must be logged in to create a workout session.",
    );
    assert.equal(
      newSessionCreateError({ ...ready, performedOn: "" }),
      "Please choose a performed date.",
    );
    assert.equal(
      newSessionCreateError({ ...ready, exerciseRows: [] }),
      "Add at least one exercise.",
    );
    assert.equal(
      newSessionCreateError({ ...ready, exerciseRows: [{ exerciseId: "", baseWeightKg: "" }] }),
      "Please choose an exercise for each row.",
    );
    assert.equal(
      newSessionCreateError({
        ...ready,
        exerciseRows: [{ exerciseId: "ex-1", baseWeightKg: "-2" }],
      }),
      "Please enter a valid base weight for each exercise.",
    );
    assert.equal(newSessionCreateError(ready), null);
  });
});
