import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  buildPersonalBestRows,
  formatPersonalBestLoad,
  formatPersonalBestSet,
  isAssistanceExercise,
  personalBestLoadMarkLabel,
  type PersonalBestCatalogExercise,
  type PersonalBestSetSample,
} from "./personal-bests";

const catalog: PersonalBestCatalogExercise[] = [
  { id: "squat", slug: "back-squat", label: "Barbell Back Squat" },
  { id: "bench", slug: "barbell-bench-press", label: "Barbell Bench Press" },
  { id: "dip", slug: "assisted-dip", label: "Assisted Dip" },
  { id: "pull", slug: "assisted-pull-up", label: "Assisted Pull-Up" },
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
    assert.equal(personalBestLoadMarkLabel(true), "Least assistance");
    assert.equal(personalBestLoadMarkLabel(false), "Heaviest load");
    assert.equal(formatPersonalBestSet(rows[0]?.bestSet ?? null), "25 kg × 8 reps");
    assert.equal(formatPersonalBestLoad(rows[0]?.heaviestLoad ?? null), "25 kg");
    assert.equal(formatPersonalBestSet(null), "—");
    assert.equal(formatPersonalBestLoad(null), "—");
  });

  it("ranks assisted moves by least assistance, then more reps, and keeps 0 kg", () => {
    const rows = buildPersonalBestRows(catalog, [
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        performedOn: "2026-01-01",
        reps: 5,
        loadedKg: 10,
        totalKg: 10,
      }),
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        performedOn: "2026-02-01",
        reps: 8,
        loadedKg: 10,
        totalKg: 10,
      }),
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        performedOn: "2026-03-01",
        reps: 12,
        loadedKg: 20,
        totalKg: 20,
      }),
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        performedOn: "2026-04-01",
        reps: 6,
        loadedKg: 0,
        totalKg: 0,
      }),
    ]);
    assert.deepEqual(rows[0]?.bestSet, { valueKg: 0, reps: 6, performedOn: "2026-04-01" });
    assert.deepEqual(rows[0]?.heaviestLoad, { valueKg: 0, reps: null, performedOn: "2026-04-01" });

    const tied = buildPersonalBestRows(catalog, [
      sample({
        exerciseId: "pull",
        slug: "assisted-pull-up",
        performedOn: "2026-02-01",
        reps: 8,
        loadedKg: 15,
        totalKg: 15,
      }),
      sample({
        exerciseId: "pull",
        slug: "assisted-pull-up",
        performedOn: "2026-01-01",
        reps: 5,
        loadedKg: 15,
        totalKg: 15,
      }),
      sample({
        exerciseId: "pull",
        slug: "assisted-pull-up",
        performedOn: "2026-03-01",
        reps: 3,
        loadedKg: 25,
        totalKg: 25,
      }),
    ]);
    assert.deepEqual(tied[0]?.bestSet, { valueKg: 15, reps: 8, performedOn: "2026-02-01" });
    assert.deepEqual(tied[0]?.heaviestLoad, { valueKg: 15, reps: null, performedOn: "2026-01-01" });
  });

  it("describes least assistance in the Personal best glossary entry", () => {
    const glossary = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/(shell)/glossary/page.tsx"),
      "utf8",
    );
    const entry = glossary.slice(
      glossary.indexOf('term: "Personal best"'),
      glossary.indexOf('term: "Plan"'),
    );
    assert.match(entry, /Assisted Dip and Assisted Pull-Up/);
    assert.match(entry, /Least assistance is the lowest Assistance \(kg\)/);
    assert.match(entry, /0 kg is unassisted bodyweight/);
  });
});
