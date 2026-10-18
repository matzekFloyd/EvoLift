import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  exerciseLabelForSessionExercise,
  lastLoggedSet,
  resolvedAddDraft,
  setsForSessionExercise,
} from "./session-detail-model";

const squatSets = [
  {
    session_exercise_id: "ex-1",
    set_number: 2,
    is_warmup: false,
    reps: 5,
    weight_kg: 80,
  },
  {
    session_exercise_id: "ex-1",
    set_number: 1,
    is_warmup: true,
    reps: 8,
    weight_kg: 40,
  },
  {
    session_exercise_id: "ex-2",
    set_number: 1,
    is_warmup: false,
    reps: 10,
    weight_kg: 20,
  },
];

describe("setsForSessionExercise", () => {
  it("keeps one exercise and orders sets by set number", () => {
    assert.deepEqual(
      setsForSessionExercise(squatSets, "ex-1").map((set) => set.set_number),
      [1, 2],
    );
  });
});

describe("lastLoggedSet", () => {
  it("returns the highest set number for that exercise", () => {
    assert.equal(lastLoggedSet(squatSets, "ex-1")?.set_number, 2);
  });

  it("returns null when the exercise has no sets", () => {
    assert.equal(lastLoggedSet(squatSets, "missing"), null);
  });
});

describe("exerciseLabelForSessionExercise", () => {
  const exercises = [{ id: "ex-1", exercise_id: "squat" }];

  it("uses the catalog label", () => {
    assert.equal(
      exerciseLabelForSessionExercise(exercises, new Map([["squat", "Barbell Back Squat"]]), "ex-1"),
      "Barbell Back Squat",
    );
  });

  it("falls back to the exercise id, then to a generic label", () => {
    assert.equal(exerciseLabelForSessionExercise(exercises, new Map(), "ex-1"), "squat");
    assert.equal(exerciseLabelForSessionExercise(exercises, new Map(), "gone"), "exercise");
  });
});

describe("resolvedAddDraft", () => {
  it("keeps an in-progress add draft and otherwise suggests the last working set", () => {
    assert.deepEqual(
      resolvedAddDraft(
        [{ id: "ex-1", target_reps: 5, target_weight_kg: 60 }],
        squatSets,
        { "ex-1": { reps: "3" } },
        "ex-1",
      ),
      { reps: "3", weightKg: "80", isWarmup: false },
    );
  });
});
