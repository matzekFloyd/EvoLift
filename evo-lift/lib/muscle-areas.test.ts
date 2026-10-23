import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  EXERCISE_MUSCLE_AREA_ROWS,
  MUSCLE_AREA_LABELS,
  MUSCLE_AREAS,
  exerciseMuscleAreas,
  isMuscleArea,
  muscleAreaLabel,
  type MuscleArea,
} from "./muscle-areas";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

function sqlValues(): string {
  return EXERCISE_MUSCLE_AREA_ROWS.map(([slug, primary, secondary]) => {
    const secondarySql = secondary == null ? "null" : `'${secondary}'`;
    return `  ('${slug}', '${primary}', ${secondarySql})`;
  }).join(",\n");
}

function translationSlugs(sql: string): string[] {
  return [...sql.matchAll(/^\s+\('([a-z0-9]+(?:-[a-z0-9]+)*)',/gm)].map((match) => match[1]);
}

describe("muscle areas", () => {
  it("uses only the shared vocabulary", () => {
    assert.deepEqual(
      MUSCLE_AREAS.map((area) => muscleAreaLabel(area)),
      ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"],
    );
    assert.deepEqual(MUSCLE_AREA_LABELS.chest, "Chest");
    assert.equal(isMuscleArea("chest"), true);
    assert.equal(isMuscleArea("Chest"), false);
    assert.equal(isMuscleArea("arms"), false);
    assert.equal(isMuscleArea("legs"), false);
    assert.equal(isMuscleArea("forearms"), false);
  });

  it("gives every catalog exercise one primary and an optional different secondary", () => {
    const slugs = EXERCISE_MUSCLE_AREA_ROWS.map(([slug]) => slug);
    assert.deepEqual(slugs, [...slugs].sort((left, right) => left.localeCompare(right)));
    assert.equal(new Set(slugs).size, slugs.length);

    for (const [slug, primary, secondary] of EXERCISE_MUSCLE_AREA_ROWS) {
      assert.equal(isMuscleArea(primary), true, slug);
      assert.equal(rowHasThirdArea(slug), false, slug);
      if (secondary != null) {
        assert.equal(isMuscleArea(secondary), true, slug);
        assert.notEqual(secondary, primary, slug);
      }
      assert.deepEqual(exerciseMuscleAreas(slug), { primary, secondary });
    }

    assert.equal(exerciseMuscleAreas("not-an-exercise"), null);
  });

  it("follows the compound and isolation judgment calls", () => {
    same(["back-squat", "front-squat"], "quads", "glutes");
    same(["barbell-bench-press", "barbell-incline-press"], "chest", "triceps");
    same(["close-grip-bench-press"], "triceps", "chest");
    same(["overhead-press"], "shoulders", "triceps");
    same(["barbell-bent-over-row", "pull-up", "lat-pulldown"], "back", "biceps");
    same(["barbell-romanian-deadlift"], "hamstrings", "glutes");
    same(["deadlift", "sumo-deadlift", "trap-bar-deadlift"], "hamstrings", "back");
    same(["barbell-hip-thrust"], "glutes", "hamstrings");
    same(["leg-extension"], "quads", null);
    same(["lying-leg-curl", "seated-leg-curl"], "hamstrings", null);
    same(
      ["barbell-curl", "cable-curl", "dumbbell-supinated-curl", "ez-bar-curl", "hammer-curl", "single-arm-cable-curl"],
      "biceps",
      null,
    );
    same(["cable-tricep-pushdown", "dumbbell-skull-crusher"], "triceps", null);
    same(["dumbbell-lateral-raise", "cable-lateral-raise", "machine-lateral-raise"], "shoulders", null);
    same(["standing-calf-raise", "seated-calf-raise"], "calves", null);
    same(["plank", "crunch"], "core", null);
    same(["assisted-dip"], "chest", "triceps");
    same(["assisted-pull-up"], "back", "biceps");
  });

  it("tags the rest of the catalog with the same movement rules", () => {
    const covered = new Set<string>();
    const tag = (slugs: string[], primary: MuscleArea, secondary: MuscleArea | null) => {
      for (const slug of slugs) {
        assert.equal(covered.has(slug), false, `listed twice: ${slug}`);
        covered.add(slug);
        assert.deepEqual(exerciseMuscleAreas(slug), { primary, secondary }, slug);
      }
    };

    tag(
      [
        "back-squat",
        "front-squat",
        "goblet-squat",
        "hack-squat",
        "bulgarian-split-squat",
        "leg-press",
        "dumbbell-walking-lunge",
      ],
      "quads",
      "glutes",
    );
    tag(
      [
        "barbell-bench-press",
        "barbell-incline-press",
        "dumbbell-bench-press",
        "dumbbell-floor-press",
        "dumbbell-incline-press",
        "machine-chest-press",
        "machine-incline-chest-press",
        "push-up",
        "assisted-dip",
      ],
      "chest",
      "triceps",
    );
    tag(["cable-flye", "dumbbell-flye", "pec-deck"], "chest", null);
    tag(["close-grip-bench-press"], "triceps", "chest");
    tag(
      ["overhead-press", "dumbbell-overhead-press", "dumbbell-seated-shoulder-press", "arnold-press"],
      "shoulders",
      "triceps",
    );
    tag(
      [
        "barbell-bent-over-row",
        "dumbbell-row",
        "cable-seated-row",
        "chest-supported-row",
        "chest-supported-t-bar-row",
        "lat-pulldown",
        "neutral-grip-pulldown",
        "reverse-grip-lat-pulldown",
        "single-arm-pulldown",
        "pull-up",
        "chin-up",
        "assisted-pull-up",
      ],
      "back",
      "biceps",
    );
    tag(["barbell-romanian-deadlift", "dumbbell-romanian-deadlift"], "hamstrings", "glutes");
    tag(["deadlift", "sumo-deadlift", "trap-bar-deadlift"], "hamstrings", "back");
    tag(
      ["barbell-hip-thrust", "dumbbell-single-leg-hip-thrust", "glute-bridge", "cable-pull-through"],
      "glutes",
      "hamstrings",
    );
    tag(["leg-extension", "single-leg-leg-extension"], "quads", null);
    tag(["lying-leg-curl", "seated-leg-curl", "single-leg-lying-leg-curl"], "hamstrings", null);
    tag(
      ["barbell-curl", "cable-curl", "dumbbell-supinated-curl", "ez-bar-curl", "hammer-curl", "single-arm-cable-curl"],
      "biceps",
      null,
    );
    tag(
      ["cable-tricep-pushdown", "cable-tricep-kickback", "dumbbell-skull-crusher", "single-arm-rope-tricep-extension"],
      "triceps",
      null,
    );
    tag(["dumbbell-lateral-raise", "cable-lateral-raise", "machine-lateral-raise"], "shoulders", null);
    tag(["bent-over-reverse-dumbbell-flye", "cable-reverse-flye", "reverse-pec-deck"], "shoulders", null);
    tag(["seated-face-pull"], "shoulders", "back");
    tag(["standing-calf-raise", "seated-calf-raise"], "calves", null);
    tag(["plank", "crunch", "bicycle-crunch", "cable-crunch", "hanging-leg-raise", "pallof-press"], "core", null);
    tag(["machine-seated-hip-abduction"], "glutes", null);
    tag(["back-extension"], "back", "glutes");

    const catalog = EXERCISE_MUSCLE_AREA_ROWS.map(([slug]) => slug);
    assert.deepEqual([...covered].sort(), [...catalog].sort());
  });

  it("stores the same tags on the catalog seed and migration", () => {
    const values = sqlValues();
    const seed = readRepo("supabase", "seeds", "001_exercises.sql");
    const migration = readRepo("supabase", "migrations", "20261023130000_exercise_muscle_areas.sql");
    const translations = readRepo("supabase", "seeds", "002_exercise_translations.sql");
    const enumSql = MUSCLE_AREAS.map((area) => `  '${area}'`).join(",\n");

    assert.equal(seed.includes(values), true);
    assert.equal(migration.includes(values), true);
    assert.equal(seed.split(values).length, 2);
    assert.equal(migration.split(values).length, 2);
    assert.equal(migration.includes(`create type public.muscle_area as enum (\n${enumSql}\n);`), true);
    assert.equal(migration.includes("alter column primary_muscle_area set not null"), true);
    assert.equal(migration.includes("exercises_secondary_muscle_area_differs_chk"), true);
    assert.equal(migration.includes("where primary_muscle_area is null"), true);
    assert.equal(seed.includes("secondary_muscle_area"), true);

    const named = translationSlugs(translations);
    assert.deepEqual(named.sort(), EXERCISE_MUSCLE_AREA_ROWS.map(([slug]) => slug).sort());
  });
});

function same(slugs: string[], primary: MuscleArea, secondary: MuscleArea | null) {
  for (const slug of slugs) {
    assert.deepEqual(exerciseMuscleAreas(slug), { primary, secondary }, slug);
  }
}

function rowHasThirdArea(slug: string): boolean {
  const tags = exerciseMuscleAreas(slug);
  if (tags == null) {
    return true;
  }
  return Object.keys(tags).some((key) => key !== "primary" && key !== "secondary");
}
