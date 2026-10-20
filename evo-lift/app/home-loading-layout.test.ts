import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  HOME_PAST_WORKOUT_PLACEHOLDER_ROWS,
  HOME_PLAN_LOADING_CLASSNAME,
  HOME_UPCOMING_PLACEHOLDER_ROWS,
} from "./home-loading-layout";

describe("home loading layout", () => {
  it("reserves the first page of Past workouts and the demo upcoming rows", () => {
    assert.equal(HOME_PAST_WORKOUT_PLACEHOLDER_ROWS, 20);
    assert.equal(HOME_UPCOMING_PLACEHOLDER_ROWS, 2);
  });

  it("keeps a min height on the plan panel while it loads", () => {
    assert.match(HOME_PLAN_LOADING_CLASSNAME, /min-h-/);
  });
});
