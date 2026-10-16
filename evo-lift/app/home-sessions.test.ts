import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { homeExerciseBadgeTone, homeExerciseBadges, homeSetCount } from "./home-sessions";

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
        { slug: "back-squat", hasLoggedSet: true, skipped: false },
        { slug: "bench-press", hasLoggedSet: false, skipped: false },
        { slug: "deadlift", hasLoggedSet: true, skipped: true },
      ],
    );
    assert.deepEqual(homeExerciseBadges(null), []);
  });

  it("uses the alert tone for a skipped exercise, even when sets were logged", () => {
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: true, skipped: true }), "skipped");
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: true, skipped: false }), "sessionLogged");
    assert.equal(homeExerciseBadgeTone({ hasLoggedSet: false, skipped: false }), "default");
  });
});
