import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SESSION_DETAIL_EXERCISE_QUERY,
  sessionDetailExercisePath,
  sessionDetailHref,
} from "./session-detail-query";

describe("session detail query", () => {
  it("replaces the exercise query and drops the search when it is empty", () => {
    assert.equal(
      sessionDetailHref("/sessions/abc", "ex=old", (params) => {
        params.set(SESSION_DETAIL_EXERCISE_QUERY, "new");
      }),
      "/sessions/abc?ex=new",
    );
    assert.equal(
      sessionDetailHref("/sessions/abc", "ex=old", (params) => {
        params.delete(SESSION_DETAIL_EXERCISE_QUERY);
      }),
      "/sessions/abc",
    );
  });

  it("omits ex for the first exercise and sets it for a later one", () => {
    assert.equal(sessionDetailExercisePath("abc", null), "/sessions/abc");
    assert.equal(sessionDetailExercisePath("abc", "squat"), "/sessions/abc?ex=squat");
  });
});
