import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  compactSetNumbers,
  nextSetNumber,
  parseAddedSessionExercise,
  parseLoggedSetInput,
  parseSessionTargets,
  PLANNED_SESSION_SETS_MESSAGE,
  TARGETS_EXERCISE_MISSING,
  upcomingSessionLogMessage,
} from "./session-input";

describe("session input", () => {
  it("blocks a planned session from logging sets", () => {
    assert.equal(
      PLANNED_SESSION_SETS_MESSAGE,
      "Upcoming workouts cannot have sets yet. Log sets on or after the session date.",
    );
    assert.equal(TARGETS_EXERCISE_MISSING, "Could not determine which exercise targets to update.");
    assert.equal(
      upcomingSessionLogMessage("Mar 6, 2028"),
      "Sets can be logged on Mar 6, 2028. Move this session to today to log it now.",
    );
  });

  it("requires reps and treats a blank weight as bodyweight only", () => {
    assert.deepEqual(parseLoggedSetInput("", "20"), {
      ok: false,
      message: "Please enter a valid reps value.",
    });
    assert.deepEqual(parseLoggedSetInput("5", "-1"), {
      ok: false,
      message: "Please enter a valid weight.",
    });
    assert.deepEqual(parseLoggedSetInput("5", ""), { ok: true, reps: 5, weightKg: null });
    assert.deepEqual(parseLoggedSetInput("5", "0"), { ok: true, reps: 5, weightKg: 0 });
  });

  it("numbers the next set after the highest existing set", () => {
    assert.equal(nextSetNumber([]), 1);
    assert.equal(nextSetNumber([1, 4, 2]), 5);
  });

  it("closes gaps so a deleted warmup does not leave set 1 and set 3", () => {
    assert.deepEqual(
      compactSetNumbers([
        { id: "a", set_number: 1 },
        { id: "c", set_number: 3 },
      ]),
      [{ id: "c", setNumber: 2 }],
    );
    assert.deepEqual(
      compactSetNumbers([
        { id: "c", set_number: 3 },
        { id: "b", set_number: 2 },
      ]),
      [
        { id: "b", setNumber: 1 },
        { id: "c", setNumber: 2 },
      ],
    );
    assert.deepEqual(
      compactSetNumbers([
        { id: "a", set_number: 1 },
        { id: "b", set_number: 2 },
      ]),
      [],
    );
  });

  it("rejects a non-positive target and keeps a blank target empty", () => {
    assert.deepEqual(parseSessionTargets({ targetSets: "", targetReps: "5", targetWeightKg: "" }), {
      ok: true,
      targetSets: null,
      targetReps: 5,
      targetWeightKg: null,
    });
    assert.deepEqual(parseSessionTargets({ targetSets: "0", targetReps: "", targetWeightKg: "" }), {
      ok: false,
      message: "Please enter a valid number of target working sets.",
    });
  });

  it("warns when the exercise is already in the session", () => {
    assert.deepEqual(
      parseAddedSessionExercise({
        exerciseId: "",
        alreadyInSession: false,
        targetSets: "",
        targetReps: "",
        targetWeightKg: "",
        baseWeightKg: "",
      }),
      { ok: false, tone: "error", message: "Please choose an exercise to add." },
    );
    assert.deepEqual(
      parseAddedSessionExercise({
        exerciseId: "ex-1",
        alreadyInSession: true,
        targetSets: "",
        targetReps: "",
        targetWeightKg: "",
        baseWeightKg: "",
      }),
      { ok: false, tone: "warning", message: "That exercise is already in this session." },
    );
    assert.deepEqual(
      parseAddedSessionExercise({
        exerciseId: "ex-1",
        alreadyInSession: false,
        targetSets: "3",
        targetReps: "5",
        targetWeightKg: "100",
        baseWeightKg: "-1",
      }),
      { ok: false, tone: "error", message: "Please enter a valid base weight." },
    );
    assert.deepEqual(
      parseAddedSessionExercise({
        exerciseId: "ex-1",
        alreadyInSession: false,
        targetSets: "3",
        targetReps: "8",
        targetWeightKg: "7",
        baseWeightKg: "20",
        omitBaseWeight: true,
      }),
      {
        ok: true,
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 7,
        baseWeightKg: null,
      },
    );
  });
});
