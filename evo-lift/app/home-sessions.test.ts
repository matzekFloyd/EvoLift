import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  homeExerciseBadgeLabel,
  homeExerciseBadgeTone,
  homeExerciseBadges,
  homeExerciseSetsShort,
  homeSetCount,
} from "./home-sessions";

describe("home sessions", () => {
  it("uses zero when the set count is missing", () => {
    assert.equal(homeSetCount(4), 4);
    assert.equal(homeSetCount("3"), 3);
    assert.equal(homeSetCount(null), 0);
    assert.equal(homeSetCount("nope"), 0);
  });

  it("keeps badges that have a slug and marks a logged set only when the flag is true", () => {
    assert.deepEqual(
      homeExerciseBadges([
        { slug: "back-squat", has_logged_set: true },
        { slug: "", has_logged_set: true },
        { slug: "bench-press", has_logged_set: false },
        { slug: "deadlift", has_logged_set: true, not_done: true },
      ]),
      [
        { slug: "back-squat", hasLoggedSet: true, skipped: false, setsShort: false, label: "back-squat" },
        { slug: "bench-press", hasLoggedSet: false, skipped: false, setsShort: false, label: "bench-press" },
        {
          slug: "deadlift",
          hasLoggedSet: true,
          skipped: true,
          setsShort: false,
          label: "deadlift, skipped",
        },
      ],
    );
    assert.deepEqual(homeExerciseBadges(null), []);
  });

  it("uses the alert tone for a skipped exercise, even when sets were logged", () => {
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: true, skipped: true }), "skipped");
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: true, skipped: false }), "sessionLogged");
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: false, skipped: false }), "default");
    assert.equal(
      homeExerciseBadgeTone({ hasLoggedSet: true, skipped: false, setsShort: true }),
      "skipped",
    );
  });

  it("marks a finished session short only when working sets are below the target", () => {
    assert.equal(
      homeExerciseSetsShort({ completed: true, skipped: false, targetSets: 3, workingSetCount: 2 }),
      true,
    );
    assert.equal(
      homeExerciseSetsShort({ completed: true, skipped: false, targetSets: 3, workingSetCount: 3 }),
      false,
    );
    assert.equal(
      homeExerciseSetsShort({ completed: true, skipped: false, targetSets: null, workingSetCount: 0 }),
      false,
    );
    assert.equal(
      homeExerciseSetsShort({ completed: false, skipped: false, targetSets: 3, workingSetCount: 1 }),
      false,
    );
    assert.equal(
      homeExerciseSetsShort({ completed: true, skipped: true, targetSets: 3, workingSetCount: 0 }),
      false,
    );
  });

  it("labels a short exercise with the working-set count and keeps skipped for not done", () => {
    assert.equal(
      homeExerciseBadgeLabel({
        slug: "deadlift",
        skipped: false,
        setsShort: true,
        workingSetCount: 2,
        targetSets: 3,
      }),
      "deadlift, 2 of 3 sets",
    );
    assert.deepEqual(
      homeExerciseBadges(
        [
          { slug: "deadlift", has_logged_set: true, working_set_count: 2, target_sets: 3 },
          { slug: "back-squat", has_logged_set: true, working_set_count: 3, target_sets: 3 },
          { slug: "bench-press", has_logged_set: true, not_done: true, working_set_count: 1, target_sets: 3 },
          { slug: "overhead-press", has_logged_set: true, working_set_count: 1, target_sets: null },
        ],
        { completed: true },
      ),
      [
        {
          slug: "deadlift",
          hasLoggedSet: true,
          skipped: false,
          setsShort: true,
          label: "deadlift, 2 of 3 sets",
        },
        {
          slug: "back-squat",
          hasLoggedSet: true,
          skipped: false,
          setsShort: false,
          label: "back-squat",
        },
        {
          slug: "bench-press",
          hasLoggedSet: true,
          skipped: true,
          setsShort: false,
          label: "bench-press, skipped",
        },
        {
          slug: "overhead-press",
          hasLoggedSet: true,
          skipped: false,
          setsShort: false,
          label: "overhead-press",
        },
      ],
    );
    assert.equal(
      homeExerciseBadges(
        [{ slug: "deadlift", has_logged_set: true, working_set_count: 1, target_sets: 3 }],
        { completed: false },
      )[0]?.setsShort,
      false,
    );
  });

  it("counts only working sets in the home summary view", () => {
    const sql = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../supabase/migrations/20261105150000_home_badge_working_sets.sql",
      ),
      "utf8",
    );
    assert.match(sql, /count\(wset\.id\) filter \(where wset\.is_warmup = false\)/);
  });
});
