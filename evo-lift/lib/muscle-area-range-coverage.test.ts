import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { MUSCLE_AREA_PRIMARY_FILLS } from "@/lib/muscle-area-coverage";
import { MUSCLE_AREAS, exerciseMuscleAreas } from "@/lib/muscle-areas";
import {
  muscleAreaRangeBarPercent,
  muscleAreaRangeCoverage,
  type MuscleAreaRangeSet,
} from "./muscle-area-range-coverage";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

function set(overrides: Partial<MuscleAreaRangeSet> & Pick<MuscleAreaRangeSet, "slug">): MuscleAreaRangeSet {
  return {
    reps: 5,
    totalKg: 100,
    ...overrides,
  };
}

function area(sets: readonly MuscleAreaRangeSet[], name: string) {
  const match = muscleAreaRangeCoverage(sets).areas.find((item) => item.area === name);
  assert.ok(match, name);
  return match;
}

describe("muscle area range coverage", () => {
  it("lists every catalog area as not trained when the range is empty", () => {
    const coverage = muscleAreaRangeCoverage([]);
    assert.equal(coverage.totalVolumeKg, 0);
    assert.deepEqual(
      coverage.areas.map((item) => item.area),
      [...MUSCLE_AREAS],
    );
    for (const item of coverage.areas) {
      assert.equal(item.valueText, "Not trained");
      assert.equal(item.trained, false);
      assert.equal(item.volumeKg, 0);
      assert.equal(item.shade, 0);
    }
  });

  it("reads tags from the catalog and adds squat volume to quads only", () => {
    const tags = exerciseMuscleAreas("back-squat");
    assert.equal(tags?.primary, "quads");
    assert.equal(tags?.secondary, "glutes");
    const coverage = muscleAreaRangeCoverage([set({ slug: "back-squat" })]);
    const quads = area([set({ slug: "back-squat" })], "quads");
    const glutes = area([set({ slug: "back-squat" })], "glutes");
    const hamstrings = area([set({ slug: "back-squat" })], "hamstrings");

    assert.equal(quads.volumeKg, 500);
    assert.equal(quads.valueText, "100%");
    assert.equal(quads.mark, "primary");
    assert.equal(quads.shade, MUSCLE_AREA_PRIMARY_FILLS.length - 1);
    assert.equal(glutes.trained, true);
    assert.equal(glutes.volumeKg, 0);
    assert.equal(glutes.valueText, "Trained");
    assert.equal(glutes.mark, "secondary");
    assert.equal(glutes.shade, 0);
    assert.equal(hamstrings.valueText, "Not trained");
    assert.equal(hamstrings.mark, "missing");
    assert.equal(hamstrings.shade, 0);
    assert.notEqual(glutes.mark, hamstrings.mark);
    assert.equal(coverage.totalVolumeKg, 500);
  });

  it("adds deadlift volume to hamstrings and marks back trained", () => {
    const tags = exerciseMuscleAreas("deadlift");
    assert.equal(tags?.primary, "hamstrings");
    assert.equal(tags?.secondary, "back");
    const hamstrings = area([set({ slug: "deadlift", reps: 3, totalKg: 140 })], "hamstrings");
    const back = area([set({ slug: "deadlift", reps: 3, totalKg: 140 })], "back");
    assert.equal(hamstrings.volumeKg, 420);
    assert.equal(hamstrings.valueText, "100%");
    assert.equal(back.valueText, "Trained");
    assert.equal(back.mark, "secondary");
    assert.equal(back.volumeKg, 0);
    assert.equal(back.shade, 0);
  });

  it("marks assistance areas trained and adds no volume", () => {
    const sets = [
      set({ slug: "assisted-dip", reps: 8, totalKg: 15 }),
      set({ slug: "assisted-pull-up", reps: 6, totalKg: 10 }),
    ];
    const coverage = muscleAreaRangeCoverage(sets);
    assert.equal(coverage.totalVolumeKg, 0);
    assert.equal(area(sets, "chest").valueText, "Trained");
    assert.equal(area(sets, "chest").volumeKg, 0);
    assert.equal(area(sets, "chest").shade, 0);
    assert.equal(area(sets, "triceps").valueText, "Trained");
    assert.equal(area(sets, "back").valueText, "Trained");
    assert.equal(area(sets, "biceps").valueText, "Trained");
    assert.equal(area(sets, "quads").valueText, "Not trained");
    assert.equal(
      coverage.areas.reduce((sum, item) => sum + item.volumeKg, 0),
      0,
    );
  });

  it("ignores warmups, sets with no logged load, and unknown slugs", () => {
    const sets = [
      set({ slug: "back-squat", isWarmup: true, reps: 10, totalKg: 200 }),
      set({ slug: "deadlift", hasLoggedLoad: false, reps: 5, totalKg: 180 }),
      set({ slug: "not-a-lift", reps: 8, totalKg: 40 }),
      set({ slug: "barbell-curl", reps: 0, totalKg: 30 }),
    ];
    const coverage = muscleAreaRangeCoverage(sets);
    assert.equal(coverage.totalVolumeKg, 0);
    for (const item of coverage.areas) {
      assert.equal(item.valueText, "Not trained", item.area);
      assert.equal(item.volumeKg, 0);
    }
  });

  it("keeps primary volumes equal to the included volume", () => {
    const sets = [
      set({ slug: "back-squat", reps: 5, totalKg: 100 }),
      set({ slug: "back-squat", reps: 3, totalKg: 110, isWarmup: true }),
      set({ slug: "barbell-curl", reps: 10, totalKg: 20 }),
      set({ slug: "assisted-dip", reps: 8, totalKg: 15 }),
    ];
    const coverage = muscleAreaRangeCoverage(sets);
    const summed = coverage.areas.reduce((sum, item) => sum + item.volumeKg, 0);
    assert.equal(summed, coverage.totalVolumeKg);
    assert.equal(coverage.totalVolumeKg, 5 * 100 + 10 * 20);
    assert.equal(area(sets, "quads").volumeKg, 500);
    assert.equal(area(sets, "biceps").volumeKg, 200);
    assert.equal(area(sets, "glutes").volumeKg, 0);
    assert.equal(area(sets, "chest").valueText, "Trained");
  });

  it("darkens a larger primary share and keeps a smaller share lighter", () => {
    const sets = [
      set({ slug: "barbell-curl", reps: 10, totalKg: 20 }),
      set({ slug: "ez-bar-curl", reps: 10, totalKg: 20 }),
      set({ slug: "barbell-bench-press", reps: 5, totalKg: 20 }),
    ];
    const biceps = area(sets, "biceps");
    const chest = area(sets, "chest");
    const triceps = area(sets, "triceps");
    assert.equal(biceps.volumeKg, 400);
    assert.equal(chest.volumeKg, 100);
    assert.equal(biceps.valueText, "80%");
    assert.equal(chest.valueText, "20%");
    assert.ok(biceps.shade > chest.shade);
    assert.ok(chest.shade > 0);
    assert.equal(triceps.valueText, "Trained");
    assert.equal(triceps.shade, 0);
    assert.equal(triceps.volumeKg, 0);
  });

  it("darkens a larger share more than a smaller one in the same range", () => {
    const sets = [
      set({ slug: "barbell-bench-press", reps: 30, totalKg: 1 }),
      set({ slug: "deadlift", reps: 25, totalKg: 1 }),
      set({ slug: "back-squat", reps: 19, totalKg: 1 }),
      set({ slug: "barbell-bent-over-row", reps: 14, totalKg: 1 }),
      set({ slug: "overhead-press", reps: 12, totalKg: 1 }),
    ];
    const chest = area(sets, "chest");
    const hamstrings = area(sets, "hamstrings");
    const quads = area(sets, "quads");
    const back = area(sets, "back");
    const shoulders = area(sets, "shoulders");
    assert.equal(chest.valueText, "30%");
    assert.equal(hamstrings.valueText, "25%");
    assert.equal(quads.valueText, "19%");
    assert.equal(back.valueText, "14%");
    assert.equal(shoulders.valueText, "12%");
    assert.equal(chest.shade, MUSCLE_AREA_PRIMARY_FILLS.length - 1);
    assert.ok(chest.shade > hamstrings.shade);
    assert.ok(hamstrings.shade > quads.shade);
    assert.ok(quads.shade > back.shade);
    assert.ok(back.shade >= shoulders.shade);
    assert.ok(shoulders.shade > area(sets, "glutes").shade);
    assert.equal(area(sets, "glutes").valueText, "Trained");
    assert.equal(area(sets, "calves").valueText, "Not trained");
  });

  it("uses the same shade when two areas have the same share", () => {
    const sets = [
      set({ slug: "barbell-curl", reps: 5, totalKg: 20 }),
      set({ slug: "cable-tricep-pushdown", reps: 5, totalKg: 20 }),
    ];
    const biceps = area(sets, "biceps");
    const triceps = area(sets, "triceps");
    assert.equal(biceps.valueText, "50%");
    assert.equal(triceps.valueText, "50%");
    assert.equal(biceps.shade, triceps.shade);
    assert.ok(biceps.shade > 0);
  });

  it("keeps biceps, triceps, quads, hamstrings, and glutes separate", () => {
    const sets = [
      set({ slug: "barbell-curl", reps: 8, totalKg: 20 }),
      set({ slug: "close-grip-bench-press", reps: 5, totalKg: 40 }),
      set({ slug: "back-squat", reps: 5, totalKg: 100 }),
      set({ slug: "lying-leg-curl", reps: 10, totalKg: 30 }),
    ];
    assert.equal(area(sets, "biceps").volumeKg, 160);
    assert.equal(area(sets, "triceps").volumeKg, 200);
    assert.equal(area(sets, "quads").volumeKg, 500);
    assert.equal(area(sets, "hamstrings").volumeKg, 300);
    assert.equal(area(sets, "glutes").valueText, "Trained");
    assert.equal(area(sets, "glutes").volumeKg, 0);
    assert.equal(area(sets, "chest").valueText, "Trained");
    assert.equal(area(sets, "calves").valueText, "Not trained");
    assert.ok(area(sets, "quads").shade > area(sets, "biceps").shade);
  });

  it("fills the bar by share of range volume", () => {
    assert.equal(muscleAreaRangeBarPercent(30, 100), 30);
    assert.equal(muscleAreaRangeBarPercent(25, 100), 25);
    assert.equal(muscleAreaRangeBarPercent(0, 100), 0);
    assert.equal(muscleAreaRangeBarPercent(30, 0), 0);
  });

  it("shows at least 1% when a primary has a very small share", () => {
    const sets = [
      set({ slug: "back-squat", reps: 10, totalKg: 100 }),
      set({ slug: "standing-calf-raise", reps: 1, totalKg: 1 }),
    ];
    assert.equal(area(sets, "calves").valueText, "1%");
    assert.ok(area(sets, "calves").shade > 0);
    assert.ok(area(sets, "quads").shade > area(sets, "calves").shade);
  });

  it("does not keep a hard-coded slug list for the range", () => {
    const source = readRepo("evo-lift", "lib", "muscle-area-range-coverage.ts");
    assert.match(source, /exerciseMuscleAreas/);
    assert.match(source, /isAssistanceExercise/);
    assert.equal(source.includes("barbell-bench-press"), false);
    assert.equal(source.includes("BODY_PARTS"), false);
  });

  it("shows the range on Insights and leaves pattern notes in lift comparison", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "insights", "page.tsx");
    const section = readRepo("evo-lift", "app", "components", "muscle-area-insights.tsx");
    const figure = readRepo("evo-lift", "app", "components", "muscle-area-figure.tsx");
    const progress = readRepo("evo-lift", "lib", "exercise-progress-insights.ts");
    const comparison = readRepo("evo-lift", "app", "components", "lift-comparison-panel.tsx");
    const glossary = readRepo("evo-lift", "app", "(shell)", "glossary", "page.tsx");

    assert.match(page, /muscleAreaRangeCoverage\(\s*listedExerciseSets\.filter/);
    assert.match(page, /<MuscleAreaInsightsSection[^>]*className="sm:col-span-3"/);
    const muscleAt = page.indexOf("<MuscleAreaInsightsSection");
    const progressAt = page.indexOf("<ExerciseProgressPanel");
    const comparisonAt = page.indexOf("<LiftComparisonPanel");
    assert.ok(muscleAt > 0 && muscleAt < progressAt && progressAt < comparisonAt);
    assert.match(section, /aria-label="Muscle areas"/);
    assert.equal(section.includes("<h3"), false);
    assert.match(section, /PanelInset/);
    assert.equal(section.includes("CollapsibleSection"), false);
    assert.match(section, /area\.label/);
    assert.match(section, /area\.valueText/);
    assert.equal(section.includes("areas in this range"), false);
    assert.equal(section.includes("does not add volume"), false);
    assert.match(section, /MuscleAreaCoverageBodies/);
    assert.match(section, /MuscleAreaCoverageLayout/);
    assert.match(section, /MuscleAreaCoverageRow/);
    assert.equal(section.includes("min-[36rem]:grid-cols-2"), false);
    assert.match(section, /primary: "Volume"/);
    assert.match(section, /secondary: "Trained"/);
    assert.match(section, /missing: "Not trained"/);
    assert.match(section, /area\.mark === "primary"/);
    assert.match(section, /muscleAreaRangeBarPercent\(area\.volumeKg, coverage\.totalVolumeKg\)/);
    assert.equal(section.includes("maxVolume"), false);
    assert.equal(section.includes("MuscleAreaShareBodies"), false);
    assert.equal(section.includes("amber"), false);
    assert.equal(figure.includes("MuscleAreaShareBodies"), false);
    assert.match(figure, /justify-self-center/);
    assert.match(figure, /@min-\[56rem\]:justify-self-start/);
    assert.equal(figure.includes("sm:justify-self-start"), false);
    assert.equal(figure.includes("sm:justify-start"), false);
    assert.match(figure, /legend\.primary/);
    assert.match(figure, /legend\.secondary/);
    assert.match(figure, /legend\.missing/);
    assert.equal(progress.includes("BODY_PARTS"), false);
    assert.equal(progress.includes("Not trained"), false);
    assert.match(progress, /buildPatternNotes/);
    assert.match(comparison, /press with no pull/);
    assert.equal(comparison.includes("marked not trained"), false);
    assert.equal(comparison.includes("arms, legs"), false);
    assert.equal(glossary.split('term: "Muscle area"').length - 1, 1);
  });
});
