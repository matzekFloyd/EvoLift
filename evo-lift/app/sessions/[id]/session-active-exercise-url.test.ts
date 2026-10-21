import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  activeExerciseQueryString,
  resolveActiveExerciseFromUrl,
} from "./session-active-exercise-url";

describe("resolveActiveExerciseFromUrl", () => {
  const exerciseIds = ["a", "b", "c"];

  it("resets to the first exercise and clears a stale param when the session has no exercises", () => {
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds: [], exerciseParam: "a", listChanged: false }),
      { action: "set", index: 0, clearParam: true },
    );
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds: [], exerciseParam: null, listChanged: true }),
      { action: "set", index: 0, clearParam: false },
    );
  });

  it("selects the exercise named in the URL", () => {
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds, exerciseParam: "c", listChanged: true }),
      { action: "set", index: 2, clearParam: false },
    );
  });

  it("falls back to the first exercise and clears an unknown id", () => {
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds, exerciseParam: "gone", listChanged: false }),
      { action: "set", index: 0, clearParam: true },
    );
  });

  it("keeps the selection when the list changed and the URL names no exercise", () => {
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds, exerciseParam: null, listChanged: true }),
      { action: "none" },
    );
  });

  it("returns to the first exercise when the URL names none and the list is unchanged", () => {
    assert.deepEqual(
      resolveActiveExerciseFromUrl({ exerciseIds, exerciseParam: null, listChanged: false }),
      { action: "set", index: 0, clearParam: false },
    );
  });
});

describe("activeExerciseQueryString", () => {
  it("adds the param for a later exercise and keeps other params", () => {
    assert.equal(
      activeExerciseQueryString({ searchString: "tab=1", activeExerciseIndex: 1, activeExerciseId: "b" }),
      "tab=1&ex=b",
    );
  });

  it("returns null when the URL already matches", () => {
    assert.equal(
      activeExerciseQueryString({ searchString: "ex=b", activeExerciseIndex: 1, activeExerciseId: "b" }),
      null,
    );
    assert.equal(
      activeExerciseQueryString({ searchString: "", activeExerciseIndex: 0, activeExerciseId: "a" }),
      null,
    );
  });

  it("drops the param for the first exercise", () => {
    assert.equal(
      activeExerciseQueryString({ searchString: "ex=b", activeExerciseIndex: 0, activeExerciseId: "a" }),
      "",
    );
    assert.equal(
      activeExerciseQueryString({ searchString: "tab=1&ex=b", activeExerciseIndex: 0, activeExerciseId: "a" }),
      "tab=1",
    );
  });
});
