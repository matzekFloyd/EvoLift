import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildPersonalBestRows,
  formatPersonalBestLoad,
  formatPersonalBestSet,
  isAssistanceExercise,
  type PersonalBestCatalogExercise,
  type PersonalBestSetSample,
} from "./personal-bests";

const catalog: PersonalBestCatalogExercise[] = [
  { id: "squat", slug: "back-squat", label: "Barbell Back Squat" },
  { id: "bench", slug: "barbell-bench-press", label: "Barbell Bench Press" },
  { id: "dip", slug: "assisted-dip", label: "Assisted Dip" },
];

function sample(
  partial: Partial<PersonalBestSetSample> &
    Pick<PersonalBestSetSample, "exerciseId" | "slug" | "performedOn" | "reps" | "loadedKg" | "totalKg">,
): PersonalBestSetSample {
  return {
    label: partial.label ?? partial.slug,
    ...partial,
  };
}

describe("personal bests", () => {
  it("ranks best set by Total (kg), then reps, then earliest date", () => {
    const rows = buildPersonalBestRows(catalog, [
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        performedOn: "2026-02-01",
        reps: 3,
        loadedKg: 100,
        totalKg: 120,
      }),
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        performedOn: "2026-01-01",
        reps: 5,
        loadedKg: 100,
        totalKg: 120,
      }),
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        performedOn: "2026-03-01",
        reps: 2,
        loadedKg: 105,
        totalKg: 125,
      }),
    ]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]?.bestSet, { valueKg: 125, reps: 2, performedOn: "2026-03-01" });
    assert.deepEqual(rows[0]?.heaviestLoad, { valueKg: 105, reps: null, performedOn: "2026-03-01" });
  });

  it("picks heaviest Loaded (kg) even when Total is lower", () => {
    const rows = buildPersonalBestRows(catalog, [
      sample({
        exerciseId: "bench",
        slug: "barbell-bench-press",
        performedOn: "2026-01-10",
        reps: 5,
        loadedKg: 60,
        totalKg: 80,
      }),
      sample({
        exerciseId: "bench",
        slug: "barbell-bench-press",
        performedOn: "2026-01-20",
        reps: 3,
        loadedKg: 70,
        totalKg: 70,
      }),
    ]);
    assert.equal(rows[0]?.bestSet?.valueKg, 80);
    assert.equal(rows[0]?.heaviestLoad?.valueKg, 70);
    assert.equal(rows[0]?.heaviestLoad?.performedOn, "2026-01-20");
  });

  it("lists only exercises with a logged best", () => {
    const samples = [
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        performedOn: "2026-01-01",
        reps: 5,
        loadedKg: 80,
        totalKg: 100,
      }),
    ];
    const rows = buildPersonalBestRows(catalog, samples);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.exerciseId, "squat");
    assert.equal(buildPersonalBestRows(catalog, []).length, 0);
  });

  it("marks assistance exercises and formats cells", () => {
    assert.equal(isAssistanceExercise("assisted-dip"), true);
    assert.equal(isAssistanceExercise("assisted-pull-up"), true);
    assert.equal(isAssistanceExercise("back-squat"), false);

    const rows = buildPersonalBestRows(catalog, [
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        label: "Assisted Dip",
        performedOn: "2026-04-01",
        reps: 8,
        loadedKg: 25,
        totalKg: 25,
      }),
    ]);
    assert.equal(rows[0]?.isAssistance, true);
    assert.equal(formatPersonalBestSet(rows[0]?.bestSet ?? null), "25 kg × 8 reps");
    assert.equal(formatPersonalBestLoad(rows[0]?.heaviestLoad ?? null), "25 kg");
    assert.equal(formatPersonalBestSet(null), "—");
    assert.equal(formatPersonalBestLoad(null), "—");
  });
});
