import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { coerceKg, loadMilestoneWorkingSets } from "./milestone-sets";

function setsClient(options: {
  exercises?: unknown;
  exercisesError?: string;
  catalog?: unknown;
  catalogError?: string;
  sets?: unknown;
  setsError?: string;
  sessions?: unknown;
  sessionsError?: string;
}) {
  return {
    from(table: string) {
      const failed =
        table === "workout_session_exercises"
          ? options.exercisesError
          : table === "exercises"
            ? options.catalogError
            : options.setsError;
      const data =
        table === "workout_session_exercises"
          ? (options.exercises ?? [])
          : table === "exercises"
            ? (options.catalog ?? [])
            : (options.sets ?? []);
      const result = failed ? { data: null, error: { message: failed } } : { data, error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "in", "range"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      return builder;
    },
    rpc(name: string) {
      assert.equal(name, "workout_sessions_by_ids");
      if (options.sessionsError) {
        return Promise.resolve({ data: null, error: { message: options.sessionsError } });
      }
      return Promise.resolve({ data: options.sessions ?? [], error: null });
    },
  };
}

describe("coerceKg", () => {
  it("returns a rounded number or nothing", () => {
    assert.equal(coerceKg(null), null);
    assert.equal(coerceKg(""), null);
    assert.equal(coerceKg("nope"), null);
    assert.equal(coerceKg("62.555"), 62.56);
  });
});

describe("loadMilestoneWorkingSets", () => {
  it("returns nothing when no exercises are requested", async () => {
    assert.deepEqual(await loadMilestoneWorkingSets(setsClient({}) as never, ["", ""], "user-1"), []);
  });

  it("adds the session base weight and skips a set with no load", async () => {
    const sets = await loadMilestoneWorkingSets(
      setsClient({
        exercises: [{ id: "se-1", exercise_id: "squat", base_weight_kg: 20, session_id: "session-1" }],
        sessions: [{ id: "session-1", performed_on: "2026-10-14", created_at: "2026-10-14T09:00:00Z" }],
        sets: [
          {
            session_exercise_id: "se-1",
            reps: 5,
            weight_kg: 60,
            is_warmup: false,
            performed_at: "2026-10-14T12:00:00Z",
          },
          {
            session_exercise_id: "se-1",
            reps: 5,
            weight_kg: null,
            is_warmup: false,
            performed_at: "2026-10-14T12:05:00Z",
          },
        ],
      }) as never,
      ["squat"],
      "user-1",
    );
    assert.deepEqual(sets, [
      {
        exerciseId: "squat",
        reps: 5,
        totalKg: 80,
        isWarmup: false,
        performedAt: "2026-10-14T12:00:00Z",
        performedOn: "2026-10-14",
      },
    ]);
  });

  it("keeps 0 kg assistance and drops a 0 kg total on other exercises", async () => {
    const sets = await loadMilestoneWorkingSets(
      setsClient({
        catalog: [
          { id: "dip", slug: "assisted-dip" },
          { id: "squat", slug: "back-squat" },
        ],
        exercises: [
          { id: "se-dip", exercise_id: "dip", base_weight_kg: 0, session_id: "session-1" },
          { id: "se-squat", exercise_id: "squat", base_weight_kg: 0, session_id: "session-1" },
        ],
        sessions: [{ id: "session-1", performed_on: "2026-10-14", created_at: "2026-10-14T09:00:00Z" }],
        sets: [
          {
            session_exercise_id: "se-dip",
            reps: 8,
            weight_kg: 0,
            is_warmup: false,
            performed_at: "2026-10-14T12:00:00Z",
          },
          {
            session_exercise_id: "se-dip",
            reps: 8,
            weight_kg: null,
            is_warmup: false,
            performed_at: "2026-10-14T12:01:00Z",
          },
          {
            session_exercise_id: "se-squat",
            reps: 5,
            weight_kg: 0,
            is_warmup: false,
            performed_at: "2026-10-14T12:02:00Z",
          },
        ],
      }) as never,
      ["dip", "squat"],
      "user-1",
    );
    assert.deepEqual(sets, [
      {
        exerciseId: "dip",
        reps: 8,
        totalKg: 0,
        isWarmup: false,
        performedAt: "2026-10-14T12:00:00Z",
        performedOn: "2026-10-14",
      },
    ]);
  });

  it("reports a failed read", async () => {
    await assert.rejects(
      () =>
        loadMilestoneWorkingSets(setsClient({ exercisesError: "down" }) as never, ["squat"], "user-1"),
      /Could not load workout sets\./,
    );
  });
});
