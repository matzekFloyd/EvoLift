import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { STARTER_PLAN_NOTES, STARTER_PLANS, starterPlanSeedSqlRows } from "./starter-plans";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const PPL_COMPOUNDS = new Set(["back-squat", "barbell-bench-press", "deadlift", "overhead-press"]);
const PPL_ISOLATION = new Set([
  "dumbbell-lateral-raise",
  "pec-deck",
  "cable-tricep-pushdown",
  "seated-face-pull",
  "barbell-curl",
  "hammer-curl",
  "lying-leg-curl",
  "standing-calf-raise",
  "cable-crunch",
]);

describe("starter plans", () => {
  it("names the four plans without a prefix and tells the lifter to repeat the cycle", () => {
    assert.deepEqual(
      STARTER_PLANS.map((plan) => plan.name),
      ["Full body", "Upper / Lower", "Push / Pull / Legs", "Body part"],
    );
    for (const plan of STARTER_PLANS) {
      assert.equal(plan.name.startsWith("EVO"), false);
    }
    assert.equal(STARTER_PLAN_NOTES, "Do the days in order, then start again.");
  });

  it("marks numbered day variants with a hash", () => {
    const names = STARTER_PLANS.flatMap((plan) => plan.days.map((day) => day.name));
    assert.deepEqual(names, [
      "Full Body #1",
      "Full Body #2",
      "Full Body #3",
      "Lower Body #1",
      "Upper Body #1",
      "Lower Body #2",
      "Upper Body #2",
      "Push",
      "Pull",
      "Legs",
      "Chest & Triceps",
      "Legs & Abs",
      "Back & Biceps",
      "Legs & Abs",
      "Shoulders & Arms",
    ]);
    for (const name of names) {
      if (/\d$/.test(name)) {
        assert.match(name, / #\d+$/);
      }
    }
  });

  it("keeps the two Legs & Abs days as separate workouts", () => {
    const bodyPart = STARTER_PLANS.find((plan) => plan.name === "Body part");
    const legs = bodyPart?.days.filter((day) => day.name === "Legs & Abs") ?? [];
    assert.equal(legs.length, 2);
    assert.equal(legs[0]?.exercises[0]?.slug, "back-squat");
    assert.equal(legs[1]?.exercises[0]?.slug, "deadlift");
  });

  it("uses the Push / Pull / Legs set and rep rule", () => {
    const plan = STARTER_PLANS.find((row) => row.name === "Push / Pull / Legs");
    assert.ok(plan);
    for (const day of plan.days) {
      for (const row of day.exercises) {
        assert.equal(row.sets, 3);
        assert.equal(row.notes, null);
        if (PPL_COMPOUNDS.has(row.slug)) {
          assert.equal(row.reps, 5);
        } else if (PPL_ISOLATION.has(row.slug)) {
          assert.equal(row.reps, 10);
        } else {
          assert.equal(row.reps, 8);
        }
      }
    }
  });

  it("stores a plank hold as 20 seconds in the exercise notes", () => {
    const planks = STARTER_PLANS.flatMap((plan) => plan.days.flatMap((day) => day.exercises)).filter(
      (row) => row.slug === "plank",
    );
    assert.equal(planks.length, 2);
    for (const plank of planks) {
      assert.equal(plank.sets, 3);
      assert.equal(plank.reps, 20);
      assert.equal(plank.notes, "20 sec");
    }
  });

  it("uses catalog slugs and the same rows as the signup migration", () => {
    const catalog = readFileSync(path.join(repoRoot, "supabase/seeds/001_exercises.sql"), "utf8");
    const slugs = new Set(
      STARTER_PLANS.flatMap((plan) => plan.days.flatMap((day) => day.exercises.map((row) => row.slug))),
    );
    for (const slug of slugs) {
      assert.equal(catalog.includes(`'${slug}'`), true, slug);
      assert.ok(slug.length > 0);
    }

    const migration = readFileSync(
      path.join(repoRoot, "supabase/migrations/20261025100000_seed_default_workout_plans.sql"),
      "utf8",
    );
    for (const row of starterPlanSeedSqlRows()) {
      assert.equal(migration.includes(row), true, row);
    }
    assert.match(migration, /perform public\.seed_default_strength_milestones\(new\.id\);/);
    assert.match(migration, /perform public\.seed_default_workout_plans\(new\.id\);/);
    assert.match(migration, /where not exists/);
    assert.equal(migration.includes(STARTER_PLAN_NOTES), true);
    assert.equal(migration.includes("is_active"), true);
    assert.equal(migration.includes("target_weight_kg"), true);
  });
});
