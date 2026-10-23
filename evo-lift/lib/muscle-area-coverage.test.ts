import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { MUSCLE_AREAS } from "@/lib/muscle-areas";
import {
  MUSCLE_AREA_COVERAGE_NOTE,
  MUSCLE_AREA_MISSING_CLASS,
  MUSCLE_AREA_SHADE_CLASSES,
  exerciseRowSlugs,
  muscleAreaCoverage,
  muscleAreaCoverageSummary,
} from "./muscle-area-coverage";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

function area(slugs: readonly string[], name: string) {
  const match = muscleAreaCoverage(slugs).areas.find((item) => item.area === name);
  assert.ok(match, name);
  return match;
}

describe("muscle area coverage", () => {
  it("lists every catalog area and counts none when no exercise is chosen", () => {
    const coverage = muscleAreaCoverage([]);
    assert.equal(coverage.includedCount, 0);
    assert.deepEqual(
      coverage.areas.map((item) => item.area),
      [...MUSCLE_AREAS],
    );
    for (const item of coverage.areas) {
      assert.equal(item.valueText, "Missing");
      assert.equal(item.included, false);
      assert.equal(item.primaryCount, 0);
      assert.equal(item.shade, 0);
      assert.equal(item.shadeClass, MUSCLE_AREA_MISSING_CLASS);
    }
    assert.equal(muscleAreaCoverageSummary("plan", 0), "0 of 10 areas in this plan.");
    assert.equal(muscleAreaCoverageSummary("template", 0), "0 of 10 areas in this template.");
  });

  it("includes a secondary area without darkening it", () => {
    const coverage = muscleAreaCoverage(["deadlift"]);
    const hamstrings = area(["deadlift"], "hamstrings");
    const back = area(["deadlift"], "back");
    const chest = area(["deadlift"], "chest");

    assert.equal(coverage.includedCount, 2);
    assert.equal(hamstrings.valueText, "1");
    assert.equal(hamstrings.primaryCount, 1);
    assert.equal(hamstrings.shade, MUSCLE_AREA_SHADE_CLASSES.length - 1);
    assert.equal(back.valueText, "Secondary");
    assert.equal(back.included, true);
    assert.equal(back.primaryCount, 0);
    assert.equal(back.shade, 0);
    assert.equal(back.shadeClass, MUSCLE_AREA_SHADE_CLASSES[0]);
    assert.equal(chest.valueText, "Missing");
    assert.equal(chest.shadeClass, MUSCLE_AREA_MISSING_CLASS);
    assert.notEqual(back.shadeClass, chest.shadeClass);
    assert.equal(
      MUSCLE_AREA_COVERAGE_NOTE,
      "The number counts primary exercises. A secondary area is included and does not add to it.",
    );
  });

  it("counts the same exercise on two days as two primary rows", () => {
    const hamstrings = area(["deadlift", "deadlift"], "hamstrings");
    const back = area(["deadlift", "deadlift"], "back");
    assert.equal(hamstrings.primaryCount, 2);
    assert.equal(hamstrings.valueText, "2");
    assert.equal(back.valueText, "Secondary");
    assert.equal(back.shade, 0);
    assert.ok(hamstrings.shade > back.shade);
  });

  it("darkens a larger primary count and keeps zero the lightest", () => {
    const slugs = ["deadlift", "deadlift", "deadlift", "deadlift", "barbell-bench-press"];
    const hamstrings = area(slugs, "hamstrings");
    const chest = area(slugs, "chest");
    const triceps = area(slugs, "triceps");
    assert.equal(hamstrings.primaryCount, 4);
    assert.equal(chest.primaryCount, 1);
    assert.ok(hamstrings.shade > chest.shade);
    assert.ok(chest.shade > 0);
    assert.equal(triceps.shade, 0);
    assert.equal(triceps.valueText, "Secondary");
  });

  it("keeps biceps, triceps, quads, hamstrings, and glutes separate", () => {
    const slugs = ["barbell-curl", "close-grip-bench-press", "back-squat", "lying-leg-curl"];
    assert.equal(area(slugs, "biceps").valueText, "1");
    assert.equal(area(slugs, "triceps").valueText, "1");
    assert.equal(area(slugs, "quads").valueText, "1");
    assert.equal(area(slugs, "hamstrings").valueText, "1");
    assert.equal(area(slugs, "glutes").valueText, "Secondary");
    assert.equal(area(slugs, "chest").valueText, "Secondary");
    assert.equal(area(slugs, "calves").valueText, "Missing");
    assert.equal(muscleAreaCoverage(slugs).includedCount, 6);
  });

  it("ignores an empty row and a slug that is not in the catalog", () => {
    const options = [
      { id: "ex-deadlift", slug: "deadlift" },
      { id: "ex-unknown", slug: "not-a-lift" },
    ];
    const slugs = exerciseRowSlugs(
      [
        { exerciseId: "" },
        { exerciseId: "ex-deadlift" },
        { exerciseId: "ex-deadlift" },
        { exerciseId: "missing" },
        { exerciseId: "ex-unknown" },
      ],
      options,
    );
    assert.deepEqual(slugs, ["deadlift", "deadlift", "not-a-lift"]);
    assert.equal(area(slugs, "hamstrings").primaryCount, 2);
    assert.equal(muscleAreaCoverage(["", "not-a-lift"]).includedCount, 0);
  });

  it("uses one sky ramp and no other hue", () => {
    const levels = MUSCLE_AREA_SHADE_CLASSES.map((shadeClass) => {
      const match = shadeClass.match(/bg-sky-(\d+)/);
      assert.ok(match, shadeClass);
      assert.match(shadeClass, /^border-sky-\d+ bg-sky-\d+ text-/);
      return Number(match[1]);
    });
    for (let index = 1; index < levels.length; index += 1) {
      assert.ok(levels[index] > levels[index - 1]);
    }
    assert.equal(levels[0], 100);
    assert.equal(levels[levels.length - 1], 700);
  });

  it("shows one chart on the plan editor and one on the template editor", () => {
    const plan = readRepo("evo-lift", "app", "plans", "plan-editor-client.tsx");
    const template = readRepo("evo-lift", "app", "templates", "template-editor-client.tsx");
    const chart = readRepo("evo-lift", "app", "components", "muscle-area-coverage-chart.tsx");

    assert.equal(plan.split("<MuscleAreaCoverageChart").length - 1, 1);
    assert.equal(template.split("<MuscleAreaCoverageChart").length - 1, 1);
    assert.ok(plan.indexOf("<MuscleAreaCoverageChart") < plan.indexOf("{days.map"));
    assert.match(plan, /scope="plan"/);
    assert.match(plan, /days\.flatMap\(\(day\) => day\.exerciseRows\)/);
    assert.ok(template.indexOf("<MuscleAreaCoverageChart") < template.indexOf("<WorkoutExerciseDraftList"));
    assert.match(template, /scope="template"/);
    assert.match(chart, /area\.label/);
    assert.match(chart, /area\.valueText/);
    assert.match(chart, /MUSCLE_AREA_COVERAGE_NOTE/);
    assert.equal(chart.includes("None"), false);
    assert.equal(chart.includes("Leaving an area out"), false);
    assert.match(MUSCLE_AREA_MISSING_CLASS, /bg-amber-/);
    assert.equal(MUSCLE_AREA_MISSING_CLASS.includes("sky"), false);
    assert.equal(chart.includes("per day"), false);
    assert.equal(chart.includes("kg"), false);
  });
});
