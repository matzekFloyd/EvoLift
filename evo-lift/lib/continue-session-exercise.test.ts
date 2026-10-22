import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  continueSessionExerciseId,
  type ContinueSessionExercise,
  type ContinueSessionSet,
} from "./continue-session-exercise";

const exercises: ContinueSessionExercise[] = [
  { id: "bench", position: 1, targetSets: 3, notDone: false },
  { id: "squat", position: 2, targetSets: 3, notDone: false },
  { id: "row", position: 3, targetSets: 3, notDone: false },
];

function workingSets(exerciseId: string, count: number, isWarmup = false): ContinueSessionSet[] {
  return Array.from({ length: count }, () => ({ sessionExerciseId: exerciseId, isWarmup }));
}

describe("continueSessionExerciseId", () => {
  it("opens the first exercise when nothing is logged", () => {
    assert.equal(continueSessionExerciseId(exercises, []), null);
  });

  it("opens the first unfinished exercise after finished ones", () => {
    assert.equal(
      continueSessionExerciseId(exercises, [
        ...workingSets("bench", 3),
        ...workingSets("squat", 1),
      ]),
      "squat",
    );
  });

  it("passes over a skipped exercise", () => {
    const skippedFirst: ContinueSessionExercise[] = [
      { ...exercises[0], notDone: true },
      exercises[1],
      exercises[2],
    ];
    assert.equal(continueSessionExerciseId(skippedFirst, workingSets("squat", 1)), "squat");
  });

  it("passes over a skipped exercise even when its working sets meet the target", () => {
    const skippedFirst: ContinueSessionExercise[] = [
      { ...exercises[0], notDone: true },
      exercises[1],
      exercises[2],
    ];
    assert.equal(
      continueSessionExerciseId(skippedFirst, [...workingSets("bench", 3), ...workingSets("squat", 1)]),
      "squat",
    );
  });

  it("does not count warmup sets toward the target", () => {
    assert.equal(continueSessionExerciseId(exercises, workingSets("bench", 3, true)), null);
    assert.equal(
      continueSessionExerciseId(exercises, [
        ...workingSets("bench", 3, true),
        ...workingSets("bench", 3),
        ...workingSets("squat", 1),
      ]),
      "squat",
    );
  });

  it("opens the first exercise when every exercise is finished or skipped", () => {
    const allDone: ContinueSessionExercise[] = [
      exercises[0],
      { ...exercises[1], notDone: true },
      exercises[2],
    ];
    assert.equal(
      continueSessionExerciseId(allDone, [...workingSets("bench", 3), ...workingSets("row", 4)]),
      null,
    );
  });

  it("stays on the first exercise when it is still unfinished", () => {
    assert.equal(continueSessionExerciseId(exercises, workingSets("squat", 3)), null);
  });

  it("uses session order, not the input array order", () => {
    const reversed = [...exercises].reverse();
    assert.equal(continueSessionExerciseId(reversed, workingSets("bench", 3)), "squat");
  });

  it("treats a missing or zero target as unfinished", () => {
    const noTarget: ContinueSessionExercise[] = [
      { ...exercises[0], targetSets: null },
      exercises[1],
    ];
    assert.equal(continueSessionExerciseId(noTarget, workingSets("bench", 5)), null);
    assert.equal(
      continueSessionExerciseId(
        [{ ...exercises[0], targetSets: 0 }, exercises[1]],
        workingSets("bench", 5),
      ),
      null,
    );
  });

  it("returns null when the session has no exercises", () => {
    assert.equal(continueSessionExerciseId([], []), null);
  });
});
