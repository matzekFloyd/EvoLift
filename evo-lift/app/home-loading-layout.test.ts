import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  HOME_PAST_WORKOUT_PLACEHOLDER_ROWS,
  HOME_PLAN_LOADING_CLASSNAME,
} from "./home-loading-layout";

describe("home loading layout", () => {
  it("reserves the first page of Past workouts", () => {
    assert.equal(HOME_PAST_WORKOUT_PLACEHOLDER_ROWS, 20);
  });

  it("keeps a min height on the plan panel while it loads", () => {
    assert.match(HOME_PLAN_LOADING_CLASSNAME, /min-h-/);
  });
});
