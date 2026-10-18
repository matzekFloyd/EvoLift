import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import {
  applyInsightsRange,
  invalidateInsightsHistory,
  loadCachedInsightsHistory,
  loadInsightsHistory,
  loadUserStrengthProfile,
  peekInsightsExerciseSets,
  peekInsightsHistory,
  type WorkoutActivityPoint,
} from "./insights-data";

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return ymd(date);
}

function queryClient(tables: Record<string, { data: unknown; error: { message: string } | null }>) {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(table);
      const result = tables[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const name of ["select", "eq", "order", "gte", "lte", "in", "range", "maybeSingle"]) {
        builder[name] = chain;
      }
      builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
      return builder;
    },
  };
  return { client, calls };
}

const WINDOW = { from: "2026-10-01", to: "2026-10-31" };

function historyTables() {
  return {
    workout_sessions: {
      data: [{ id: "session-1", performed_on: "2026-10-12" }],
      error: null,
    },
    workout_session_exercises: {
      data: [{ id: "se-1", session_id: "session-1", exercise_id: "ex-1", base_weight_kg: 20 }],
      error: null,
    },
    workout_sets: {
      data: [
        { session_exercise_id: "se-1", reps: 5, weight_kg: 40, is_warmup: true },
        { session_exercise_id: "se-1", reps: 5, weight_kg: 60, is_warmup: false },
      ],
      error: null,
    },
    exercises: { data: [{ id: "ex-1", slug: "deadlift" }], error: null },
    exercise_translations: { data: [{ exercise_id: "ex-1", name: "Barbell Deadlift" }], error: null },
  };
}

describe("applyInsightsRange", () => {
  it("drops future days and days outside the selected span", () => {
    const points: WorkoutActivityPoint[] = [
      { date: shiftDays(-40), workouts: 1, sets: 1, loadedKg: 1 },
      { date: shiftDays(-1), workouts: 1, sets: 2, loadedKg: 2 },
      { date: shiftDays(2), workouts: 1, sets: 3, loadedKg: 3 },
    ];
    assert.deepEqual(applyInsightsRange([], "all"), []);
    assert.deepEqual(
      applyInsightsRange(points, "all").map((point) => point.date),
      [shiftDays(-40), shiftDays(-1)],
    );
    assert.deepEqual(
      applyInsightsRange(points, "4w").map((point) => point.date),
      [shiftDays(-1)],
    );
  });
});

describe("insights history", () => {
  beforeEach(() => {
    invalidateInsightsHistory();
  });

  it("counts warmups in the day total and keeps working sets for the exercise", async () => {
    const { client } = queryClient(historyTables());
    const history = await loadInsightsHistory(client as never, "user-1", WINDOW);
    assert.deepEqual(history.activity, [
      { date: "2026-10-12", workouts: 1, sets: 2, loadedKg: 500 },
    ]);
    assert.equal(history.weekly[0]?.volumeKg, 500);
    assert.equal(history.weekly[0]?.workingSets, 1);
    assert.deepEqual(history.exerciseSets, [
      {
        exerciseId: "ex-1",
        slug: "deadlift",
        label: "Barbell Deadlift",
        sessionId: "session-1",
        performedOn: "2026-10-12",
        reps: 5,
        totalKg: 80,
      },
    ]);
  });

  it("names the failed query", async () => {
    const { client } = queryClient({
      workout_sessions: { data: null, error: { message: "down" } },
    });
    await assert.rejects(
      () => loadInsightsHistory(client as never, "user-1", WINDOW),
      /Could not load workout sessions: down/,
    );
  });

  it("remembers a window and can read a narrower one from it", async () => {
    const { client, calls } = queryClient(historyTables());
    await loadCachedInsightsHistory(client as never, "user-1", WINDOW);
    const again = await loadCachedInsightsHistory(client as never, "user-1", WINDOW);
    assert.equal(calls.length, 5);
    assert.equal(peekInsightsHistory("user-1", WINDOW), again);
    assert.equal(peekInsightsExerciseSets("user-1", { from: "2026-10-12", to: "2026-10-12" })?.length, 1);
    assert.deepEqual(peekInsightsExerciseSets("user-1", { from: "2026-10-20", to: "2026-10-31" }), []);
    invalidateInsightsHistory();
    assert.equal(peekInsightsHistory("user-1", WINDOW), null);
  });
});

describe("loadUserStrengthProfile", () => {
  it("keeps female or male and a finite bodyweight", async () => {
    const { client } = queryClient({
      user_profile_metrics: {
        data: { bodyweight_kg: "80.5", sex: "other", date_of_birth: "1990-05-01", birth_year: 1990 },
        error: null,
      },
    });
    assert.deepEqual(await loadUserStrengthProfile(client as never, "user-1"), {
      sex: null,
      bodyweightKg: 80.5,
      bodyweightEntries: [],
      dateOfBirth: "1990-05-01",
      birthYear: 1990,
    });
  });

  it("reports a failed profile read", async () => {
    const { client } = queryClient({
      user_profile_metrics: { data: null, error: { message: "down" } },
    });
    await assert.rejects(
      () => loadUserStrengthProfile(client as never, "user-1"),
      /Could not load profile: down/,
    );
  });
});
