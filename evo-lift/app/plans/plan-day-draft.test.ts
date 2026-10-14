import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createDayDraft, daysFromPlan } from "./plan-day-draft";

describe("plan day drafts", () => {
  it("starts a new day with a blank name and one empty exercise", () => {
    const day = createDayDraft();
    assert.match(day.key, /^plan-day-\d+$/);
    assert.equal(day.id, null);
    assert.equal(day.name, "");
    assert.equal(day.exerciseRows.length, 1);
    assert.equal(day.exerciseRows[0]?.exerciseId, "");
  });

  it("orders saved days and keeps an empty day editable", () => {
    const days = daysFromPlan({
      days: [
        {
          id: "day-b",
          name: "Pull",
          position: 2,
          exercises: [],
        },
        {
          id: "day-a",
          name: "Push",
          position: 1,
          exercises: [
            {
              exercise_id: "ex-1",
              position: 1,
              base_weight_kg: 20,
              target_sets: 3,
              target_reps: 5,
              target_weight_kg: 100,
              notes: null,
            },
          ],
        },
      ],
    });
    assert.deepEqual(
      days.map((day) => day.name),
      ["Push", "Pull"],
    );
    assert.equal(days[0]?.id, "day-a");
    assert.equal(days[0]?.exerciseRows[0]?.exerciseId, "ex-1");
    assert.equal(days[0]?.exerciseRows[0]?.targetWeightKg, "100");
    assert.equal(days[1]?.exerciseRows[0]?.exerciseId, "");
    assert.notEqual(days[0]?.key, days[1]?.key);
  });
});
