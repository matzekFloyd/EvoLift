import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  applyAddExerciseSelection,
  CREATED_FROM_BADGE_CLASS,
  emptyAddExerciseDraft,
  exerciseLabelForSessionExercise,
  isSessionDetailsDirty,
  isTargetSetsGoalMet,
  lastLoggedSet,
  resolvedAddDraft,
  resolveTargetsExercise,
  sessionLifecycleBadgeClass,
  setsForSessionExercise,
  stickyNextLabel,
  visibleExerciseEntries,
} from "./session-detail-model";

const squatSets = [
  {
    session_exercise_id: "ex-1",
    set_number: 2,
    is_warmup: false,
    reps: 5,
    weight_kg: 80,
  },
  {
    session_exercise_id: "ex-1",
    set_number: 1,
    is_warmup: true,
    reps: 8,
    weight_kg: 40,
  },
  {
    session_exercise_id: "ex-2",
    set_number: 1,
    is_warmup: false,
    reps: 10,
    weight_kg: 20,
  },
];

describe("setsForSessionExercise", () => {
  it("keeps one exercise and orders sets by set number", () => {
    assert.deepEqual(
      setsForSessionExercise(squatSets, "ex-1").map((set) => set.set_number),
      [1, 2],
    );
  });
});

describe("lastLoggedSet", () => {
  it("returns the highest set number for that exercise", () => {
    assert.equal(lastLoggedSet(squatSets, "ex-1")?.set_number, 2);
  });

  it("returns null when the exercise has no sets", () => {
    assert.equal(lastLoggedSet(squatSets, "missing"), null);
  });
});

describe("exerciseLabelForSessionExercise", () => {
  const exercises = [{ id: "ex-1", exercise_id: "squat" }];

  it("uses the catalog label", () => {
    assert.equal(
      exerciseLabelForSessionExercise(exercises, new Map([["squat", "Barbell Back Squat"]]), "ex-1"),
      "Barbell Back Squat",
    );
  });

  it("falls back to the exercise id, then to a generic label", () => {
    assert.equal(exerciseLabelForSessionExercise(exercises, new Map(), "ex-1"), "squat");
    assert.equal(exerciseLabelForSessionExercise(exercises, new Map(), "gone"), "exercise");
  });
});

describe("resolvedAddDraft", () => {
  it("keeps an in-progress add draft and otherwise suggests the last working set", () => {
    assert.deepEqual(
      resolvedAddDraft(
        [{ id: "ex-1", target_reps: 5, target_weight_kg: 60 }],
        squatSets,
        { "ex-1": { reps: "3" } },
        "ex-1",
      ),
      { reps: "3", weightKg: "80", isWarmup: false },
    );
  });
});

describe("isSessionDetailsDirty", () => {
  const session = { performed_on: "2026-01-02", notes: "Felt good" };

  it("is clean without a session or when drafts match", () => {
    assert.equal(isSessionDetailsDirty(null, "2026-01-02", "x"), false);
    assert.equal(isSessionDetailsDirty(session, "2026-01-02", "Felt good"), false);
  });

  it("ignores surrounding whitespace and null notes", () => {
    assert.equal(isSessionDetailsDirty(session, "2026-01-02", "  Felt good "), false);
    assert.equal(isSessionDetailsDirty({ ...session, notes: null }, "2026-01-02", "  "), false);
  });

  it("is dirty when the date or notes change", () => {
    assert.equal(isSessionDetailsDirty(session, "2026-01-03", "Felt good"), true);
    assert.equal(isSessionDetailsDirty(session, "2026-01-02", "Felt great"), true);
  });
});

describe("isTargetSetsGoalMet", () => {
  const sets = [
    { session_exercise_id: "ex-1", is_warmup: true },
    { session_exercise_id: "ex-1", is_warmup: false },
    { session_exercise_id: "ex-2", is_warmup: false },
  ];

  it("counts working sets only", () => {
    assert.equal(isTargetSetsGoalMet({ id: "ex-1", target_sets: 1 }, sets), true);
    assert.equal(isTargetSetsGoalMet({ id: "ex-1", target_sets: 2 }, sets), false);
  });

  it("is never met without a positive goal or exercise", () => {
    assert.equal(isTargetSetsGoalMet({ id: "ex-1", target_sets: null }, sets), false);
    assert.equal(isTargetSetsGoalMet({ id: "ex-1", target_sets: 0 }, sets), false);
    assert.equal(isTargetSetsGoalMet(null, sets), false);
    assert.equal(isTargetSetsGoalMet(undefined, sets), false);
  });
});

describe("stickyNextLabel", () => {
  const base = {
    singleExerciseFlow: true,
    canManageSets: true,
    targetSetsMet: true,
    showExtraSetComposer: false,
    activeExerciseIndex: 0,
    exerciseCount: 3,
  };

  it("offers Next exercise once targets are met and more exercises remain", () => {
    assert.equal(stickyNextLabel(base), "Next exercise");
  });

  it("falls back to Next otherwise", () => {
    assert.equal(stickyNextLabel({ ...base, activeExerciseIndex: 2 }), "Next");
    assert.equal(stickyNextLabel({ ...base, targetSetsMet: false }), "Next");
    assert.equal(stickyNextLabel({ ...base, showExtraSetComposer: true }), "Next");
    assert.equal(stickyNextLabel({ ...base, canManageSets: false }), "Next");
    assert.equal(stickyNextLabel({ ...base, singleExerciseFlow: false }), "Next");
  });
});

describe("visibleExerciseEntries", () => {
  const exercises = ["a", "b", "c"];

  it("returns every exercise with its index", () => {
    assert.deepEqual(visibleExerciseEntries(exercises, 1, false), [
      { item: "a", index: 0 },
      { item: "b", index: 1 },
      { item: "c", index: 2 },
    ]);
  });

  it("returns only the active exercise in the single-exercise flow", () => {
    assert.deepEqual(visibleExerciseEntries(exercises, 1, true), [{ item: "b", index: 1 }]);
    assert.deepEqual(visibleExerciseEntries(exercises, 5, true), []);
  });
});

describe("applyAddExerciseSelection", () => {
  const draft = { ...emptyAddExerciseDraft, baseWeightKg: "20", targetSets: "3" };

  it("keeps base weight for loaded exercises", () => {
    assert.deepEqual(applyAddExerciseSelection(draft, "squat-id", "back-squat"), {
      ...draft,
      exerciseId: "squat-id",
    });
  });

  it("clears base weight for assistance exercises", () => {
    assert.deepEqual(applyAddExerciseSelection(draft, "pu-id", "assisted-pull-up"), {
      ...draft,
      exerciseId: "pu-id",
      baseWeightKg: "",
    });
  });
});

describe("resolveTargetsExercise", () => {
  const input = {
    sessionExercises: [{ id: "se-1", exercise_id: "squat" }],
    exerciseLabels: new Map([["squat", "Barbell Back Squat"]]),
    exerciseSlugById: new Map([["squat", "back-squat"]]),
    activeExerciseLabel: "Active lift",
  };

  it("uses the active label when nothing or an unknown row is selected", () => {
    const empty = { label: "Active lift", exerciseId: "", slug: undefined };
    assert.deepEqual(resolveTargetsExercise({ ...input, targetsSessionExerciseId: null }), empty);
    assert.deepEqual(resolveTargetsExercise({ ...input, targetsSessionExerciseId: "gone" }), empty);
  });

  it("resolves label, exercise id, and slug for the selected row", () => {
    assert.deepEqual(resolveTargetsExercise({ ...input, targetsSessionExerciseId: "se-1" }), {
      label: "Barbell Back Squat",
      exerciseId: "squat",
      slug: "back-squat",
    });
  });

  it("falls back to the exercise id when the label is missing", () => {
    assert.equal(
      resolveTargetsExercise({
        ...input,
        exerciseLabels: new Map(),
        targetsSessionExerciseId: "se-1",
      }).label,
      "squat",
    );
  });
});

describe("badge classes", () => {
  it("highlights completed sessions in sky and others in zinc", () => {
    assert.match(sessionLifecycleBadgeClass("completed"), /bg-sky-50/);
    assert.match(sessionLifecycleBadgeClass("in_progress"), /bg-zinc-100/);
    assert.match(CREATED_FROM_BADGE_CLASS, /text-zinc-600/);
  });
});