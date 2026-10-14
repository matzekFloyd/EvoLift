import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  exerciseOptionsForPicker,
  filterExercisePickerOptionsByQuery,
  type ExercisePickerOption,
} from "./exercise-picker-options";

const options: ExercisePickerOption[] = [
  { id: "squat", label: "Back Squat", slug: "back-squat" },
  { id: "deadlift", label: "Deadlift", slug: "deadlift" },
  { id: "row", label: "Barbell Bent Over Row", slug: "barbell-bent-over-row" },
];

describe("exercise picker options", () => {
  it("returns every option when the query is blank", () => {
    assert.deepEqual(filterExercisePickerOptionsByQuery(options, "  "), options);
  });

  it("matches the label, slug, or badge without case sensitivity", () => {
    assert.deepEqual(filterExercisePickerOptionsByQuery(options, "squat"), [options[0]]);
    assert.deepEqual(filterExercisePickerOptionsByQuery(options, "DEAD"), [options[1]]);
    assert.deepEqual(filterExercisePickerOptionsByQuery(options, "row"), [options[2]]);
  });

  it("hides an exercise unless that row already selected it", () => {
    const hidden = new Set(["squat", "row"]);
    assert.deepEqual(
      exerciseOptionsForPicker(options, hidden).map((option) => option.id),
      ["deadlift"],
    );
    assert.deepEqual(
      exerciseOptionsForPicker(options, hidden, "squat").map((option) => option.id),
      ["squat", "deadlift"],
    );
  });
});
