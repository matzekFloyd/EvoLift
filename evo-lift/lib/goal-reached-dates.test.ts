import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loadGoalReachedSessionDates, reachedGoalLabelsBySessionDate } from "./goal-reached-dates";

function queryClient(tables: Record<string, { data: unknown; error: { message: string } | null }>) {
  return {
    from(table: string) {
      const result = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "in", "range", "not"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      return builder;
    },
    rpc(name: string) {
      assert.equal(name, "workout_sessions_by_ids");
      const result = tables.workout_sessions ?? { data: [], error: null };
      return Promise.resolve(result);
    },
  };
}

describe("reachedGoalLabelsBySessionDate", () => {
  it("uses the workout day of the set that reached the goal", () => {
    const labels = reachedGoalLabelsBySessionDate(
      [
        { exerciseId: "squat", achievedAt: "2026-10-14T12:00:00Z", label: "100 kg × 5 reps" },
        { exerciseId: "bench", achievedAt: "2026-10-14T12:00:00Z", label: "80 kg × 3 reps" },
      ],
      [
        {
          exerciseId: "squat",
          performedAt: "2026-10-14T12:00:00Z",
          performedOn: "2026-10-13",
        },
      ],
    );
    assert.equal(labels["2026-10-13"], "100 kg × 5 reps");
    assert.equal(labels["2026-10-14"], "80 kg × 3 reps");
  });

  it("joins two goals reached on the same day and skips a bad timestamp", () => {
    assert.deepEqual(
      reachedGoalLabelsBySessionDate(
        [
          { exerciseId: "squat", achievedAt: "not-a-time", label: "100 kg × 5 reps" },
          { exerciseId: "squat", achievedAt: "2026-10-14T12:00:00Z", label: "100 kg × 5 reps" },
          { exerciseId: "bench", achievedAt: "2026-10-14T12:00:00Z", label: "100 kg × 5 reps" },
        ],
        [],
      ),
      { "2026-10-14": "100 kg × 5 reps" },
    );
  });
});

describe("loadGoalReachedSessionDates", () => {
  it("returns nothing when the goal query fails or is empty", async () => {
    const failed = queryClient({
      strength_milestones: { data: null, error: { message: "down" } },
    });
    assert.deepEqual(await loadGoalReachedSessionDates(failed as never, "user-1"), {});
    const empty = queryClient({ strength_milestones: { data: [], error: null } });
    assert.deepEqual(await loadGoalReachedSessionDates(empty as never, "user-1"), {});
  });

  it("labels the session date from the matching set", async () => {
    const client = queryClient({
      strength_milestones: {
        data: [
          {
            exercise_id: "squat",
            milestone_type: "absolute",
            target_weight_kg: 100,
            bodyweight_multiple: null,
            min_reps: 5,
            achieved_at: "2026-10-14T12:00:00Z",
          },
        ],
        error: null,
      },
      workout_sets: {
        data: [{ performed_at: "2026-10-14T12:00:00Z", session_exercise_id: "se-1" }],
        error: null,
      },
      workout_session_exercises: {
        data: [{ id: "se-1", exercise_id: "squat", session_id: "session-1" }],
        error: null,
      },
      workout_sessions: {
        data: [{ id: "session-1", performed_on: "2026-10-13" }],
        error: null,
      },
      exercises: {
        data: [{ id: "squat", slug: "back-squat" }],
        error: null,
      },
      exercise_translations: {
        data: [{ exercise_id: "squat", name: "Barbell Back Squat" }],
        error: null,
      },
    });
    assert.deepEqual(await loadGoalReachedSessionDates(client as never, "user-1"), {
      "2026-10-13": "Barbell Back Squat (100 kg × 5 reps)",
    });
  });
});
