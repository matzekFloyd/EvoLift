import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { loadTargetWeightHistory } from "./target-weight-history";

function historyClient(options: {
  auth?: { data: { user: { id: string } | null }; error: { message: string } | null };
  tables?: Record<string, { data: unknown; error: { message: string } | null }>;
}) {
  return {
    auth: {
      getUser: () => Promise.resolve(options.auth ?? { data: { user: null }, error: null }),
    },
    from(table: string) {
      const result = options.tables?.[table] ?? { data: [], error: null };
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
      return Promise.resolve(options.tables?.workout_sessions ?? { data: [], error: null });
    },
  };
}

describe("loadTargetWeightHistory", () => {
  it("returns nothing when no exercise is selected", async () => {
    assert.deepEqual(await loadTargetWeightHistory(historyClient({}) as never, ""), []);
  });

  it("requires a signed-in user", async () => {
    await assert.rejects(
      () => loadTargetWeightHistory(historyClient({}) as never, "squat"),
      /Could not load recent working sets\./,
    );
  });

  it("returns nothing when the exercise has no session rows", async () => {
    const rows = await loadTargetWeightHistory(
      historyClient({
        auth: { data: { user: { id: "user-1" } }, error: null },
        tables: { workout_session_exercises: { data: [], error: null } },
      }) as never,
      "squat",
    );
    assert.deepEqual(rows, []);
  });

  it("maps sets onto the session day", async () => {
    const rows = await loadTargetWeightHistory(
      historyClient({
        auth: { data: { user: { id: "user-1" } }, error: null },
        tables: {
          workout_session_exercises: {
            data: [{ id: "se-1", session_id: "session-1", target_weight_kg: 60, target_reps: 8 }],
            error: null,
          },
          workout_sessions: {
            data: [{ id: "session-1", performed_on: "2026-10-14T00:00:00", created_at: "2026-10-14T09:00:00Z" }],
            error: null,
          },
          workout_sets: {
            data: [
              {
                session_exercise_id: "se-1",
                set_number: 1,
                reps: 8,
                weight_kg: 60,
                is_warmup: false,
              },
            ],
            error: null,
          },
        },
      }) as never,
      "squat",
    );
    assert.deepEqual(rows, [
      {
        sessionId: "session-1",
        performedOn: "2026-10-14",
        sessionCreatedAt: "2026-10-14T09:00:00Z",
        setNumber: 1,
        reps: 8,
        loadedKg: 60,
        isWarmup: false,
        targetWeightKg: 60,
        targetReps: 8,
      },
    ]);
  });
});
