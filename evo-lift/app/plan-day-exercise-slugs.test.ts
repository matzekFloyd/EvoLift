import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { planDayExerciseSlugs } from "./plan-day-exercise-slugs";

describe("planDayExerciseSlugs", () => {
  it("returns slugs in plan order", () => {
    assert.deepEqual(
      planDayExerciseSlugs([
        { position: 2, exercises: { slug: "bent-over-row" } },
        { position: 0, exercises: { slug: "barbell-bench-press" } },
        { position: 1, exercises: [{ slug: "overhead-press" }] },
      ]),
      ["barbell-bench-press", "overhead-press", "bent-over-row"],
    );
  });

  it("drops a row with no slug", () => {
    assert.deepEqual(
      planDayExerciseSlugs([
        { position: 0, exercises: { slug: "  " } },
        { position: 1, exercises: null },
      ]),
      [],
    );
  });

  it("returns nothing when the day has no exercises", () => {
    assert.deepEqual(planDayExerciseSlugs(null), []);
    assert.deepEqual(planDayExerciseSlugs([]), []);
  });
});
