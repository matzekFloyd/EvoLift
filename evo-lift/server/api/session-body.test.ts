import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import { ApiHttpError } from "./http";
import { parseRequiredSessionExercise, parseSessionExerciseList, parseTemplateExerciseList } from "./session-body";

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: async () => ({ error: "Unauthorized", status: 401 }),
}));

const EXERCISE_ID = "123e4567-e89b-12d3-a456-426614174000";

function messageOf(run: () => void): string {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof ApiHttpError);
    assert.equal(error.status, 400);
    return error.message;
  }
  assert.fail("expected an ApiHttpError");
}

describe("parseSessionExerciseList", () => {
  it("rejects a missing list and an empty list", () => {
    assert.equal(messageOf(() => parseSessionExerciseList(undefined)), "exercises must be an array.");
    assert.equal(messageOf(() => parseSessionExerciseList([])), "Add at least one exercise.");
    assert.equal(messageOf(() => parseTemplateExerciseList([])), "Add at least one exercise.");
  });

  it("rejects an exercise that is not an object or has no UUID", () => {
    assert.equal(messageOf(() => parseRequiredSessionExercise(null)), "exercise must be a JSON object.");
    assert.equal(
      messageOf(() => parseSessionExerciseList([null])),
      "exercises[0] must be a JSON object.",
    );
    assert.equal(
      messageOf(() => parseSessionExerciseList([{}])),
      "Please provide a valid exercise_id.",
    );
    assert.equal(
      messageOf(() => parseSessionExerciseList([{ exercise_id: "not-a-uuid" }])),
      "Please provide a valid exercise_id.",
    );
  });

  it("reads reps, loaded weight, and notes from an exercise", () => {
    assert.deepEqual(parseSessionExerciseList([{ exercise_id: EXERCISE_ID }]), [
      {
        exerciseId: EXERCISE_ID,
        targetSets: null,
        targetReps: null,
        targetWeightKg: null,
        baseWeightKg: null,
        notes: null,
      },
    ]);
    assert.deepEqual(
      parseSessionExerciseList([
        {
          exercise_id: EXERCISE_ID,
          target_sets: 3,
          target_reps: 8,
          target_weight_kg: 60,
          base_weight_kg: 0,
          notes: "  pause  ",
        },
      ]),
      [
        {
          exerciseId: EXERCISE_ID,
          targetSets: 3,
          targetReps: 8,
          targetWeightKg: 60,
          baseWeightKg: 0,
          notes: "pause",
        },
      ],
    );
  });

  it("keeps the reps, weight, and notes error text", () => {
    const exercise = { exercise_id: EXERCISE_ID };
    assert.equal(
      messageOf(() => parseSessionExerciseList([{ ...exercise, target_reps: 0 }])),
      "Please enter a valid target_reps.",
    );
    assert.equal(
      messageOf(() => parseSessionExerciseList([{ ...exercise, target_weight_kg: -1 }])),
      "Please enter a valid target_weight_kg.",
    );
    assert.equal(
      messageOf(() => parseSessionExerciseList([{ ...exercise, base_weight_kg: Number.NaN }])),
      "Please enter a valid base_weight_kg.",
    );
    assert.equal(
      messageOf(() => parseSessionExerciseList([{ ...exercise, notes: "a".repeat(501) }])),
      "notes cannot be longer than 500 characters.",
    );
  });
});
