import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildExerciseProgressReport, type LifterProfile } from "./exercise-progress-insights";
import { exercisesForList, visibleInsightExerciseSets } from "./hidden-exercise-lists";
import { buildInsightsCompoundE1rmSeries } from "./insights-compound-e1rm";
import type { ExerciseWorkingSetSample } from "./insights-data";
import { buildPersonalBestRows, type PersonalBestCatalogExercise } from "./personal-bests";

const NO_PROFILE: LifterProfile = {
  sex: null,
  bodyweightKg: null,
  bodyweightEntries: [],
  ageYears: null,
  ageIsApproximate: false,
};

const catalog: PersonalBestCatalogExercise[] = [
  { id: "ex-squat", slug: "back-squat", label: "Barbell Back Squat" },
  { id: "ex-bench", slug: "barbell-bench-press", label: "Barbell Bench Press" },
  { id: "ex-curl", slug: "ez-bar-curl", label: "EZ Bar Curl" },
];

function sample(overrides: Partial<ExerciseWorkingSetSample> = {}): ExerciseWorkingSetSample {
  return {
    exerciseId: "ex-squat",
    slug: "back-squat",
    label: "Barbell Back Squat",
    sessionId: "s1",
    performedOn: "2026-02-01",
    reps: 5,
    loadedKg: 100,
    totalKg: 120,
    ...overrides,
  };
}

const samples = [
  sample(),
  sample({
    exerciseId: "ex-bench",
    slug: "barbell-bench-press",
    label: "Barbell Bench Press",
    sessionId: "s2",
    performedOn: "2026-02-02",
    loadedKg: 80,
    totalKg: 100,
  }),
];

const hidden = new Set(["ex-squat"]);

describe("visible insight exercise sets", () => {
  it("drops a hidden exercise that has logged sets and keeps the others", () => {
    const listed = visibleInsightExerciseSets(samples, hidden);
    assert.deepEqual(
      listed.map((row) => row.slug),
      ["barbell-bench-press"],
    );

    const progress = buildExerciseProgressReport(listed, { from: "2026-01-01", to: "2026-03-01" }, NO_PROFILE);
    assert.deepEqual(
      progress.rows.map((row) => row.slug),
      ["barbell-bench-press"],
    );
    assert.equal(
      [...progress.publicNotes, ...progress.balanceNotes].some((note) => note.slugs.includes("back-squat")),
      false,
    );

    const bests = buildPersonalBestRows(catalog, listed);
    assert.deepEqual(
      bests.map((row) => row.slug),
      ["barbell-bench-press"],
    );

    const chart = buildInsightsCompoundE1rmSeries(listed);
    assert.deepEqual(
      chart.map((series) => series.shortLabel),
      ["Bench"],
    );
  });

  it("keeps every sample when nothing is hidden", () => {
    assert.equal(visibleInsightExerciseSets(samples, new Set()).length, 2);
  });
});

describe("exercises list", () => {
  const exercises = [
    { id: "ex-squat", slug: "back-squat", label: "Barbell Back Squat", sessionCount: 4 },
    { id: "ex-bench", slug: "barbell-bench-press", label: "Barbell Bench Press", sessionCount: 2 },
    { id: "ex-curl", slug: "ez-bar-curl", label: "EZ Bar Curl", sessionCount: 0 },
  ];

  it("omits a hidden exercise from both scopes", () => {
    assert.deepEqual(
      exercisesForList(exercises, hidden, "used").map((row) => row.id),
      ["ex-bench"],
    );
    assert.deepEqual(
      exercisesForList(exercises, hidden, "all").map((row) => row.id),
      ["ex-bench", "ex-curl"],
    );
  });

  it("still limits With session history to exercises that have sessions", () => {
    assert.deepEqual(
      exercisesForList(exercises, new Set(), "used").map((row) => row.id),
      ["ex-squat", "ex-bench"],
    );
  });
});
