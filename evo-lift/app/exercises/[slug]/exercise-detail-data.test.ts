import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseSetHistoryRows,
  buildGoalLabelsByAchievedAt,
  filterExerciseHistoryRows,
  fullHistoryClearDateRange,
  sortExerciseHistoryTableRows,
  topRepsRowKeyFor,
  type ExerciseSetHistoryRow,
} from "./exercise-detail-data";

function row(overrides: Partial<ExerciseSetHistoryRow>): ExerciseSetHistoryRow {
  return {
    sessionId: "s1",
    performedOn: "2026-01-10",
    sessionCreatedAt: "2026-01-10T08:00:00.000Z",
    performedAt: "2026-01-10T08:05:00.000Z",
    setNumber: 1,
    reps: 5,
    weightKg: 100,
    totalKg: 100,
    isWarmup: false,
    goalLabel: null,
    ...overrides,
  };
}

describe("buildGoalLabelsByAchievedAt", () => {
  it("groups labels by achieved time and skips missing or invalid times", () => {
    const labels = buildGoalLabelsByAchievedAt("ex-1", [
      {
        milestone_type: "absolute",
        target_weight_kg: 100,
        bodyweight_multiple: null,
        min_reps: 5,
        achieved_at: "2026-01-10T08:05:00.000Z",
      },
      {
        milestone_type: "absolute",
        target_weight_kg: 120,
        bodyweight_multiple: null,
        min_reps: 1,
        achieved_at: "2026-01-10T08:05:00.000Z",
      },
      {
        milestone_type: "absolute",
        target_weight_kg: 140,
        bodyweight_multiple: null,
        min_reps: 1,
        achieved_at: null,
      },
      {
        milestone_type: "absolute",
        target_weight_kg: 160,
        bodyweight_multiple: null,
        min_reps: 1,
        achieved_at: "not-a-date",
      },
    ]);
    assert.equal(labels.size, 1);
    assert.equal(labels.get(new Date("2026-01-10T08:05:00.000Z").getTime())?.length, 2);
  });
});

describe("buildExerciseSetHistoryRows", () => {
  const base = {
    sessionIdBySessionExerciseId: new Map([["se1", "s1"]]),
    baseWeightBySessionExerciseId: new Map([["se1", 20]]),
    sessionMetaBySessionId: new Map([
      ["s1", { performedOn: "2026-01-10", createdAt: "2026-01-10T08:00:00.000Z" }],
    ]),
    goalLabelsByAchievedAt: new Map([[new Date("2026-01-10T08:05:00.000Z").getTime(), ["100 kg"]]]),
  };
  const sets = [
    {
      session_exercise_id: "se1",
      set_number: 1,
      reps: 5,
      weight_kg: 60,
      is_warmup: false,
      performed_at: "2026-01-10T08:05:00.000Z",
    },
    {
      session_exercise_id: "orphan",
      set_number: 1,
      reps: 5,
      weight_kg: 60,
      is_warmup: false,
      performed_at: "2026-01-10T08:06:00.000Z",
    },
  ];

  it("adds base weight to the total and attaches goal labels", () => {
    const rows = buildExerciseSetHistoryRows({ ...base, sets, assistance: false });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].totalKg, 80);
    assert.equal(rows[0].goalLabel, "100 kg");
  });

  it("uses loaded weight only for assistance exercises", () => {
    const rows = buildExerciseSetHistoryRows({ ...base, sets, assistance: true });
    assert.equal(rows[0].totalKg, 60);
  });
});

describe("fullHistoryClearDateRange", () => {
  it("falls back to today when there are no rows", () => {
    assert.deepEqual(fullHistoryClearDateRange([], "2026-10-21"), {
      from: "2026-10-21",
      to: "2026-10-21",
    });
  });

  it("starts at the earliest loaded set", () => {
    const range = fullHistoryClearDateRange(
      [{ performedOn: "2026-03-01" }, { performedOn: "2025-12-31T10:00:00Z" }],
      "2026-10-21",
    );
    assert.deepEqual(range, { from: "2025-12-31", to: "2026-10-21" });
  });
});

describe("filterExerciseHistoryRows", () => {
  const rows = [
    row({ performedOn: "2026-01-01" }),
    row({ performedOn: "2026-02-01", isWarmup: true }),
    row({ performedOn: "2026-03-01" }),
  ];

  it("keeps rows in the inclusive date range", () => {
    const filtered = filterExerciseHistoryRows(rows, {
      from: "2026-01-01",
      to: "2026-02-01",
      hideWarmups: false,
    });
    assert.equal(filtered.length, 2);
  });

  it("drops warmups when hidden", () => {
    const filtered = filterExerciseHistoryRows(rows, {
      from: "2026-01-01",
      to: "2026-03-01",
      hideWarmups: true,
    });
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every((r) => !r.isWarmup));
  });
});

describe("topRepsRowKeyFor", () => {
  it("returns null without rows", () => {
    assert.equal(topRepsRowKeyFor([]), null);
  });

  it("prefers more reps, then heavier load, then the earlier set", () => {
    const rows = [
      row({ sessionId: "a", setNumber: 1, reps: 5, weightKg: 100 }),
      row({ sessionId: "b", setNumber: 1, reps: 8, weightKg: 60 }),
      row({ sessionId: "c", setNumber: 2, reps: 8, weightKg: 70 }),
    ];
    assert.equal(topRepsRowKeyFor(rows), "c-2");
  });

  it("breaks full ties on the earlier session", () => {
    const rows = [
      row({ sessionId: "late", performedOn: "2026-02-01", reps: 8, weightKg: 70 }),
      row({ sessionId: "early", performedOn: "2026-01-01", reps: 8, weightKg: 70 }),
    ];
    assert.equal(topRepsRowKeyFor(rows), "early-1");
  });
});

describe("sortExerciseHistoryTableRows", () => {
  const rows = [
    row({ sessionId: "a", setNumber: 1, reps: 5, weightKg: null, totalKg: 20 }),
    row({ sessionId: "b", setNumber: 2, reps: 3, weightKg: 80, totalKg: 100 }),
    row({ sessionId: "c", setNumber: 3, reps: 8, weightKg: 60, totalKg: 80 }),
  ];

  it("sorts by reps in both directions without mutating the input", () => {
    const asc = sortExerciseHistoryTableRows(rows, "reps", "asc").map((r) => r.reps);
    const desc = sortExerciseHistoryTableRows(rows, "reps", "desc").map((r) => r.reps);
    assert.deepEqual(asc, [3, 5, 8]);
    assert.deepEqual(desc, [8, 5, 3]);
    assert.deepEqual(rows.map((r) => r.reps), [5, 3, 8]);
  });

  it("puts sets without a logged load first when ascending by load", () => {
    const sorted = sortExerciseHistoryTableRows(rows, "weightKg", "asc");
    assert.equal(sorted[0].weightKg, null);
  });

  it("sorts warmups after working sets when ascending", () => {
    const mixed = [row({ isWarmup: true, sessionId: "w" }), row({ sessionId: "k" })];
    assert.equal(sortExerciseHistoryTableRows(mixed, "isWarmup", "asc")[0].sessionId, "k");
  });
});
