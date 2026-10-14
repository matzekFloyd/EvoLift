import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { duplicatePlanName, normalizePlanDraft, validatePlanSave } from "./plan-draft";
import { createEmptyExerciseRow, type ExerciseDraftRow } from "./workout-exercise-draft";

const EXERCISE_ID = "11111111-1111-4111-8111-111111111111";
const DAY_ID = "22222222-2222-4222-8222-222222222222";

function row(partial: Partial<ExerciseDraftRow>): ExerciseDraftRow {
  return { ...createEmptyExerciseRow(), ...partial };
}

describe("normalizePlanDraft", () => {
  it("keeps a plan with no days and drops blank exercise rows", () => {
    const result = normalizePlanDraft({
      name: "  Push pull  ",
      notes: "  ",
      isActive: true,
      days: [
        {
          id: null,
          name: " Day A ",
          exerciseRows: [
            createEmptyExerciseRow(),
            row({
              exerciseId: EXERCISE_ID,
              targetSets: "3",
              targetReps: "8",
              targetWeightKg: "60",
              baseWeightKg: "20",
              notes: " Pause ",
            }),
          ],
        },
      ],
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.value.name, "Push pull");
    assert.equal(result.value.notes, null);
    assert.equal(result.value.days.length, 1);
    assert.equal(result.value.days[0]?.name, "Day A");
    assert.equal(result.value.days[0]?.exercises.length, 1);
    assert.deepEqual(result.value.days[0]?.exercises[0], {
      exerciseId: EXERCISE_ID,
      targetSets: 3,
      targetReps: 8,
      targetWeightKg: 60,
      baseWeightKg: 20,
      notes: "Pause",
    });
  });

  it("requires a plan name, a day name, and an exercise when a row has targets", () => {
    assert.equal(
      normalizePlanDraft({ name: "  ", notes: "", isActive: false, days: [] }).ok,
      false,
    );
    assert.equal(
      normalizePlanDraft({ name: "  ", notes: "", isActive: false, days: [] }).ok
        ? ""
        : (
            normalizePlanDraft({ name: "  ", notes: "", isActive: false, days: [] }) as {
              message: string;
            }
          ).message,
      "Please enter a plan name.",
    );

    const missingDay = normalizePlanDraft({
      name: "Plan",
      notes: "",
      isActive: false,
      days: [{ id: null, name: " ", exerciseRows: [] }],
    });
    assert.equal(missingDay.ok, false);
    if (!missingDay.ok) {
      assert.equal(missingDay.message, "Please enter a name for each day.");
    }

    const missingExercise = normalizePlanDraft({
      name: "Plan",
      notes: "",
      isActive: false,
      days: [
        {
          id: null,
          name: "Day A",
          exerciseRows: [row({ targetReps: "5" })],
        },
      ],
    });
    assert.equal(missingExercise.ok, false);
    if (!missingExercise.ok) {
      assert.equal(missingExercise.message, "Please choose an exercise for each row.");
    }
  });

  it("rejects invalid target reps", () => {
    const result = normalizePlanDraft({
      name: "Plan",
      notes: "",
      isActive: false,
      days: [
        {
          id: null,
          name: "Day A",
          exerciseRows: [row({ exerciseId: EXERCISE_ID, targetReps: "0" })],
        },
      ],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.message, "Please enter a valid target reps value.");
    }
  });
});

describe("validatePlanSave", () => {
  it("rejects a repeated day id", () => {
    assert.equal(
      validatePlanSave({
        name: "Plan",
        notes: null,
        isActive: false,
        days: [
          { id: DAY_ID, name: "Day A", exercises: [] },
          { id: DAY_ID, name: "Day B", exercises: [] },
        ],
      }),
      "Each day can only appear once.",
    );
  });
});

describe("duplicatePlanName", () => {
  it("appends copy and then a number when the name is taken", () => {
    assert.equal(duplicatePlanName(["Other"], "Push"), "Push copy");
    assert.equal(duplicatePlanName(["Push copy"], "Push"), "Push copy 2");
    assert.equal(duplicatePlanName(["push copy", "Push copy 2"], "Push"), "Push copy 3");
  });

  it("keeps the duplicate name within 120 characters", () => {
    const source = "P".repeat(120);
    const name = duplicatePlanName([], source);
    assert.equal(name.length <= 120, true);
    assert.equal(name.endsWith(" copy"), true);
  });
});
