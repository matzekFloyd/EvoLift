import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

vi.mock("@/server/auth/api-request", () => ({
  authenticateApiRequest: async () => ({ error: "Unauthorized", status: 401 }),
}));

import type { ExerciseWorkingSetSample, InsightsHistory, UserStrengthProfile } from "@/lib/insights-data";
import { buildInsightsPayload } from "./insights-response";

const emptyProfile: UserStrengthProfile = {
  sex: null,
  bodyweightKg: null,
  bodyweightEntries: [],
  dateOfBirth: null,
  birthYear: null,
};

describe("insights payload", () => {
  it("totals the window and starts the moving average on the fourth week", () => {
    const history: InsightsHistory = {
      activity: [
        { date: "2026-09-01", workouts: 1, sets: 4, loadedKg: 100 },
        { date: "2026-09-08", workouts: 1, sets: 4, loadedKg: 200 },
      ],
      weekly: [
        { weekStart: "2026-08-17", volumeKg: 10, workingSets: 1, sessionCount: 1 },
        { weekStart: "2026-08-24", volumeKg: 20, workingSets: 2, sessionCount: 1 },
        { weekStart: "2026-08-31", volumeKg: 30, workingSets: 3, sessionCount: 1 },
        { weekStart: "2026-09-07", volumeKg: 40, workingSets: 4, sessionCount: 1 },
      ],
      exerciseSets: [],
    };
    const payload = buildInsightsPayload({
      query: { range: "all", from: "2026-08-01", to: "2026-10-16" },
      today: new Date(2026, 9, 16),
      history,
      profile: emptyProfile,
    });
    assert.equal(payload.totals.workouts, 2);
    assert.equal(payload.totals.volume_kg, 300);
    assert.equal(payload.weekly[3]?.moving_average_volume_kg, 25);
    assert.equal(payload.weekly[0]?.moving_average_volume_kg, null);
    assert.match(payload.comparison.volume, /100\.0 kg/);
  });

  it("omits a hidden exercise from progress and lift comparison and keeps session totals", () => {
    const squat: ExerciseWorkingSetSample = {
      exerciseId: "ex-squat",
      slug: "back-squat",
      label: "Barbell Back Squat",
      sessionId: "s1",
      performedOn: "2026-09-01",
      reps: 5,
      loadedKg: 100,
      totalKg: 120,
    };
    const bench: ExerciseWorkingSetSample = {
      ...squat,
      exerciseId: "ex-bench",
      slug: "barbell-bench-press",
      label: "Barbell Bench Press",
      sessionId: "s2",
      performedOn: "2026-09-08",
      loadedKg: 80,
      totalKg: 100,
    };
    const history: InsightsHistory = {
      activity: [{ date: "2026-09-01", workouts: 2, sets: 8, loadedKg: 500 }],
      weekly: [],
      exerciseSets: [squat, bench],
    };
    const payload = buildInsightsPayload({
      query: { range: "all", from: "2026-08-01", to: "2026-10-16" },
      today: new Date(2026, 9, 16),
      history,
      profile: emptyProfile,
      hiddenExerciseIds: new Set(["ex-squat"]),
    });
    assert.equal(payload.totals.workouts, 2);
    assert.equal(payload.totals.sets, 8);
    assert.equal(payload.totals.volume_kg, 500);
    assert.deepEqual(
      payload.exercises.map((row) => row.slug),
      ["barbell-bench-press"],
    );
    assert.equal(
      payload.lift_comparison.some((note) => note.title === "Barbell Back Squat"),
      false,
    );
  });
});
