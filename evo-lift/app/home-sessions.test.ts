import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { homeExerciseBadges, homeSetCount } from "./home-sessions";

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
      ]),
      [
        { slug: "back-squat", hasLoggedSet: true },
        { slug: "bench-press", hasLoggedSet: false },
      ],
    );
    assert.deepEqual(homeExerciseBadges(null), []);
  });
});
