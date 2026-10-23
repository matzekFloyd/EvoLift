import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { EXERCISE_MUSCLE_AREA_ROWS, muscleAreaLabel } from "@/lib/muscle-areas";
import { exerciseDetailMuscleArea } from "./exercise-muscle-area-header";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

const MUSCLE_AREA_DEFINITION =
  "The part of the body an exercise trains. Each exercise has a primary muscle area and sometimes a secondary one.";

describe("exercise detail muscle area", () => {
  it("shows the catalog primary and the secondary by name", () => {
    assert.deepEqual(exerciseDetailMuscleArea("back-squat"), {
      label: "Muscle area",
      primary: "Quads",
      secondary: "Glutes",
      primaryArea: "quads",
      secondaryArea: "glutes",
    });
    const deadlift = exerciseDetailMuscleArea("deadlift");
    assert.equal(deadlift?.primary, "Hamstrings");
    assert.equal(deadlift?.secondary, "Back");
    assert.equal(deadlift?.secondary?.includes("Also"), false);
  });

  it("omits the secondary when the catalog has none", () => {
    assert.deepEqual(exerciseDetailMuscleArea("leg-extension"), {
      label: "Muscle area",
      primary: "Quads",
      secondary: null,
      primaryArea: "quads",
      secondaryArea: null,
    });
    assert.equal(exerciseDetailMuscleArea("plank")?.secondary, null);
    assert.equal(exerciseDetailMuscleArea("not-an-exercise"), null);
  });

  it("uses catalog tag labels for every exercise", () => {
    for (const [slug, primary, secondary] of EXERCISE_MUSCLE_AREA_ROWS) {
      const header = exerciseDetailMuscleArea(slug);
      assert.equal(header?.label, "Muscle area", slug);
      assert.equal(header?.primary, muscleAreaLabel(primary), slug);
      assert.equal(header?.secondary, secondary == null ? null : muscleAreaLabel(secondary), slug);
      assert.equal(header?.primaryArea, primary, slug);
      assert.equal(header?.secondaryArea, secondary, slug);
    }
  });

  it("defines Muscle area once in the glossary and renders it on the detail header", () => {
    const glossary = readRepo("evo-lift", "app", "(shell)", "glossary", "page.tsx");
    assert.equal(glossary.split(MUSCLE_AREA_DEFINITION).length - 1, 1);
    assert.match(glossary, /term: "Muscle area"/);

    const page = readRepo("evo-lift", "app", "(shell)", "app", "exercises", "[slug]", "page.tsx");
    assert.match(page, /exerciseDetailMuscleArea\(slug\)/);
    assert.match(page, /<MuscleAreaFigure/);
    assert.match(page, /secondaryLabel=\{muscleArea\.secondary\}/);

    const figure = readRepo("evo-lift", "app", "components", "muscle-area-figure.tsx");
    assert.match(figure, /sr-only">Secondary</);
    assert.equal(figure.includes("Also"), false);
    assert.match(figure, /@min-\[40rem\]:hidden/);
    assert.match(figure, /hidden \$\{LEGEND_TEXT\} @min-\[40rem\]:order-1 @min-\[40rem\]:ml-auto @min-\[40rem\]:flex/);
  });
});
