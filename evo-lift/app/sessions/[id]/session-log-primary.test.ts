import { describe, expect, it } from "vitest";
import {
  addSetComposerVisible,
  compactComposerAfterSavedSet,
  exerciseHasTargets,
  exerciseLoggingPrimary,
  compactFinishChrome,
  finishSessionIsPrimary,
  shownLogPrimary,
} from "./session-log-primary";

const logging = {
  targetsOpen: false,
  editingSet: false,
  canManageSets: true,
  hasTargets: true,
  targetsMet: false,
  singleExerciseFlow: true,
  showExtraSetComposer: false,
  addRowExpanded: false,
  hasNextExercise: true,
  canFinish: true,
};

describe("addSetComposerVisible", () => {
  it("hides the compact composer after target working sets until the lifter asks for more", () => {
    expect(
      addSetComposerVisible({
        canManageSets: true,
        targetsMet: true,
        singleExerciseFlow: true,
        showExtraSetComposer: false,
        addRowExpanded: false,
      }).compact,
    ).toBe(false);
    expect(
      addSetComposerVisible({
        canManageSets: true,
        targetsMet: true,
        singleExerciseFlow: true,
        showExtraSetComposer: true,
        addRowExpanded: false,
      }).compact,
    ).toBe(true);
  });

  it("hides the desktop add row after target working sets until it is expanded", () => {
    expect(
      addSetComposerVisible({
        canManageSets: true,
        targetsMet: true,
        singleExerciseFlow: false,
        showExtraSetComposer: false,
        addRowExpanded: false,
      }).desktop,
    ).toBe(false);
    expect(
      addSetComposerVisible({
        canManageSets: true,
        targetsMet: true,
        singleExerciseFlow: false,
        showExtraSetComposer: false,
        addRowExpanded: true,
      }).desktop,
    ).toBe(true);
  });
});

describe("compactComposerAfterSavedSet", () => {
  it("hides the composer when the last target set is saved so Finish fills", () => {
    const afterSave = compactComposerAfterSavedSet({
      savedSetIsWarmup: false,
      workingSetCount: 3,
      targetSets: 3,
    });

    expect(afterSave).toEqual({ showExtraSetComposer: false, focusNewSet: false });
    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        hasNextExercise: false,
        showExtraSetComposer: afterSave.showExtraSetComposer,
      }),
    ).toBe("finish");
  });

  it("hides the composer when an earlier exercise meets its target so Next exercise fills", () => {
    const afterSave = compactComposerAfterSavedSet({
      savedSetIsWarmup: false,
      workingSetCount: 3,
      targetSets: 3,
    });

    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        hasNextExercise: true,
        showExtraSetComposer: afterSave.showExtraSetComposer,
      }),
    ).toBe("next-exercise");
  });

  it("keeps the composer open after an extra set past the target", () => {
    const afterSave = compactComposerAfterSavedSet({
      savedSetIsWarmup: false,
      workingSetCount: 4,
      targetSets: 3,
    });

    expect(afterSave).toEqual({ showExtraSetComposer: true, focusNewSet: true });
    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        hasNextExercise: false,
        showExtraSetComposer: afterSave.showExtraSetComposer,
      }),
    ).toBe("add-set");
  });

  it("keeps the new-set form ready while target working sets are still short", () => {
    expect(
      compactComposerAfterSavedSet({
        savedSetIsWarmup: false,
        workingSetCount: 2,
        targetSets: 3,
      }),
    ).toEqual({ showExtraSetComposer: false, focusNewSet: true });
  });
});

describe("exerciseLoggingPrimary", () => {
  it("fills Add set while the composer is open", () => {
    expect(exerciseLoggingPrimary(logging)).toBe("add-set");
  });

  it("fills Set targets until the exercise has a plan", () => {
    expect(exerciseLoggingPrimary({ ...logging, hasTargets: false })).toBe("set-targets");
    expect(
      exerciseLoggingPrimary({ ...logging, hasTargets: false, targetsSheetOpen: true }),
    ).toBe("save-targets");
    expect(exerciseLoggingPrimary({ ...logging, hasTargets: false, notDone: true })).toBe(
      "add-set",
    );
    expect(
      exerciseLoggingPrimary({
        ...logging,
        hasTargets: false,
        singleExerciseFlow: false,
        addSetForward: false,
      }),
    ).toBe("finish");
  });

  it("fills Save on the set being edited, ahead of Add set and the targets form", () => {
    expect(exerciseLoggingPrimary({ ...logging, editingSet: true, targetsOpen: true })).toBe(
      "save-set",
    );
  });

  it("fills Save on the targets form when no set is being edited", () => {
    expect(exerciseLoggingPrimary({ ...logging, targetsOpen: true })).toBe("save-targets");
  });

  it("fills Next exercise after the target working sets, when another exercise follows", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        showExtraSetComposer: false,
      }),
    ).toBe("next-exercise");
  });

  it("fills Finish on the last exercise once the composer is hidden", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        hasNextExercise: false,
      }),
    ).toBe("finish");
  });

  it("keeps Add set filled when the lifter asks for more sets after the target", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        targetsMet: true,
        showExtraSetComposer: true,
        hasNextExercise: false,
      }),
    ).toBe("add-set");
  });

  it("fills Finish on the desktop header only after every add row is hidden", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        singleExerciseFlow: false,
        targetsMet: true,
        addRowExpanded: false,
      }),
    ).toBe("finish");
    expect(
      exerciseLoggingPrimary({
        ...logging,
        singleExerciseFlow: false,
        targetsMet: true,
        addRowExpanded: true,
      }),
    ).toBe("add-set");
  });

  it("leaves a later desktop Add set zinc so one exercise stays forward", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        singleExerciseFlow: false,
        addSetForward: false,
      }),
    ).toBe("finish");
    expect(
      exerciseLoggingPrimary({
        ...logging,
        singleExerciseFlow: false,
        addSetForward: false,
        canFinish: false,
      }),
    ).toBe("none");
  });

  it("fills nothing when the session cannot be logged or finished", () => {
    expect(
      exerciseLoggingPrimary({
        ...logging,
        canManageSets: false,
        canFinish: false,
        targetsMet: true,
      }),
    ).toBe("none");
  });
});

describe("shownLogPrimary", () => {
  it("lets session notes take the filled action while they are open", () => {
    expect(shownLogPrimary("add-set", true)).toBe("none");
    expect(shownLogPrimary("finish", true)).toBe("none");
    expect(shownLogPrimary("add-set", false)).toBe("add-set");
  });
});

describe("compactFinishChrome", () => {
  it("hides Finish when the session cannot be finished", () => {
    expect(compactFinishChrome({ showFinish: false, finishPrimary: false })).toBe("hidden");
    expect(compactFinishChrome({ showFinish: false, finishPrimary: true })).toBe("hidden");
  });

  it("keeps Finish as quiet text while another action is forward", () => {
    expect(compactFinishChrome({ showFinish: true, finishPrimary: false })).toBe("quiet");
  });

  it("fills Finish when it is the forward action", () => {
    expect(compactFinishChrome({ showFinish: true, finishPrimary: true })).toBe("filled");
  });
});

describe("exerciseHasTargets", () => {
  it("is set when any target field is saved, including a 0 kg target", () => {
    expect(exerciseHasTargets({})).toBe(false);
    expect(exerciseHasTargets({ target_sets: 0, target_reps: null, target_weight_kg: null })).toBe(
      false,
    );
    expect(exerciseHasTargets({ target_sets: 3 })).toBe(true);
    expect(exerciseHasTargets({ target_reps: 8 })).toBe(true);
    expect(exerciseHasTargets({ target_weight_kg: 0 })).toBe(true);
  });
});

describe("finishSessionIsPrimary", () => {
  it("stays zinc while an exercise still owns Add set, Save, Set targets, or Next exercise", () => {
    expect(
      finishSessionIsPrimary(["add-set", "finish"], { canFinish: true, detailsEditing: false }),
    ).toBe(false);
    expect(
      finishSessionIsPrimary(["next-exercise"], { canFinish: true, detailsEditing: false }),
    ).toBe(false);
    expect(
      finishSessionIsPrimary(["save-set"], { canFinish: true, detailsEditing: false }),
    ).toBe(false);
    expect(
      finishSessionIsPrimary(["set-targets"], { canFinish: true, detailsEditing: false }),
    ).toBe(false);
  });

  it("fills Finish when every exercise has handed the log back", () => {
    expect(
      finishSessionIsPrimary(["finish", "none"], { canFinish: true, detailsEditing: false }),
    ).toBe(true);
  });

  it("stays zinc while session notes are open or the session cannot be finished", () => {
    expect(
      finishSessionIsPrimary(["finish"], { canFinish: true, detailsEditing: true }),
    ).toBe(false);
    expect(
      finishSessionIsPrimary(["finish"], { canFinish: false, detailsEditing: false }),
    ).toBe(false);
  });
});
