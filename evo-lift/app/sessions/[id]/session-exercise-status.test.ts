import { describe, expect, it } from "vitest";
import {
  exerciseIdsToSkipOnComplete,
  setsToShowForSkippedExercise,
  showSessionExerciseTargetsMet,
  forcedButtonUtilityClass,
  skippedExerciseButtonClass,
  skippedExerciseLabel,
} from "./session-exercise-status";

describe("skipped exercise", () => {
  it("labels the action Skip until it is marked, then Skipped", () => {
    expect(skippedExerciseLabel(false)).toBe("Skip");
    expect(skippedExerciseLabel(true)).toBe("Skipped");
  });

  it("uses the amber warning treatment when marked", () => {
    expect(skippedExerciseButtonClass(true)).toContain("bg-amber-50");
    expect(skippedExerciseButtonClass(true)).not.toContain("zinc-800");
    expect(skippedExerciseButtonClass(false)).toContain("bg-zinc-50");
  });

  it("forces those colors over a shared button fill", () => {
    expect(forcedButtonUtilityClass("border-amber-300 hover:bg-amber-100")).toBe(
      "!border-amber-300 hover:!bg-amber-100",
    );
  });

  it("keeps every logged set while the exercise is skipped", () => {
    const sets = [
      { id: "warmup", is_warmup: true },
      { id: "working", is_warmup: false },
    ];
    expect(setsToShowForSkippedExercise(sets, true)).toEqual(sets);
    expect(setsToShowForSkippedExercise(sets, false)).toEqual(sets);
  });
});

describe("exerciseIdsToSkipOnComplete", () => {
  it("skips exercises that have no sets and leaves logged or already skipped exercises", () => {
    expect(
      exerciseIdsToSkipOnComplete(
        [
          { id: "empty", notDone: false },
          { id: "logged", notDone: false },
          { id: "warmup-only", notDone: false },
          { id: "already", notDone: true },
        ],
        [
          { sessionExerciseId: "logged" },
          { sessionExerciseId: "warmup-only" },
        ],
      ),
    ).toEqual(["empty"]);
  });
});

describe("showSessionExerciseTargetsMet", () => {
  it("is true when the working sets reach the target", () => {
    expect(
      showSessionExerciseTargetsMet({ workingSetCount: 4, targetSets: 4, notDone: false }),
    ).toBe(true);
  });

  it("stays false when the exercise is marked not done", () => {
    expect(
      showSessionExerciseTargetsMet({ workingSetCount: 4, targetSets: 4, notDone: true }),
    ).toBe(false);
  });

  it("stays false when the target is missing or not reached", () => {
    expect(
      showSessionExerciseTargetsMet({ workingSetCount: 2, targetSets: 4, notDone: false }),
    ).toBe(false);
    expect(
      showSessionExerciseTargetsMet({ workingSetCount: 2, targetSets: null, notDone: false }),
    ).toBe(false);
  });
});
