import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldScrollActiveExerciseIntoView } from "./scroll-active-exercise";

describe("shouldScrollActiveExerciseIntoView", () => {
  it("scrolls a later exercise on a wider layout", () => {
    assert.equal(
      shouldScrollActiveExerciseIntoView({
        isChecking: false,
        isPhone: false,
        isReadOnly: false,
        activeExerciseIndex: 2,
      }),
      true,
    );
  });

  it("leaves the phone log on the single exercise already on screen", () => {
    assert.equal(
      shouldScrollActiveExerciseIntoView({
        isChecking: false,
        isPhone: true,
        isReadOnly: false,
        activeExerciseIndex: 2,
      }),
      false,
    );
  });

  it("scrolls a read-only phone session because every exercise is on the page", () => {
    assert.equal(
      shouldScrollActiveExerciseIntoView({
        isChecking: false,
        isPhone: true,
        isReadOnly: true,
        activeExerciseIndex: 1,
      }),
      true,
    );
  });

  it("does not scroll the first exercise or while the session is loading", () => {
    assert.equal(
      shouldScrollActiveExerciseIntoView({
        isChecking: false,
        isPhone: false,
        isReadOnly: false,
        activeExerciseIndex: 0,
      }),
      false,
    );
    assert.equal(
      shouldScrollActiveExerciseIntoView({
        isChecking: true,
        isPhone: false,
        isReadOnly: false,
        activeExerciseIndex: 2,
      }),
      false,
    );
  });
});
