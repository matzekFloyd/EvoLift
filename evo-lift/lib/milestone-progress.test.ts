import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  formatBestSet,
  formatBodyweightMultiple,
  formatGoalGap,
  formatKgAmount,
  formatMilestoneTarget,
  formatRepCount,
  milestoneDefinitionChanged,
  parseGoalForm,
  resolveMilestone,
  roundKg,
  workingSetTotalKg,
  type MilestoneDefinition,
  type MilestoneWorkingSet,
  type StoredAchievement,
} from "./milestone-progress";

const emptyStored: StoredAchievement = {
  achievedAt: null,
  achievedBodyweightKg: null,
  achievedThresholdKg: null,
};

function definition(overrides: Partial<MilestoneDefinition> = {}): MilestoneDefinition {
  return {
    exerciseId: "squat",
    milestoneType: "absolute",
    targetWeightKg: 100,
    bodyweightMultiple: null,
    minReps: 5,
    ...overrides,
  };
}

function set(overrides: Partial<MilestoneWorkingSet> = {}): MilestoneWorkingSet {
  return {
    exerciseId: "squat",
    reps: 5,
    totalKg: 80,
    isWarmup: false,
    performedAt: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

function goalInput(overrides: Partial<Parameters<typeof parseGoalForm>[0]> = {}) {
  return {
    exerciseId: "squat",
    milestoneType: "absolute" as const,
    targetWeightKg: "100",
    bodyweightMultiple: "",
    minReps: "5",
    dueOn: "",
    note: "",
    ...overrides,
  };
}

describe("milestone totals and copy", () => {
  it("adds loaded and base weight, and drops a non-positive total", () => {
    assert.equal(roundKg(1.234), 1.23);
    assert.equal(roundKg(1.236), 1.24);
    assert.equal(workingSetTotalKg(60, 20), 80);
    assert.equal(workingSetTotalKg(60, null), 60);
    assert.equal(workingSetTotalKg(null, 20), null);
    assert.equal(workingSetTotalKg(-1, 20), null);
    assert.equal(workingSetTotalKg(0, 0), null);
  });

  it("formats a target, a gap, and a best set", () => {
    assert.equal(formatKgAmount(100), "100 kg");
    assert.equal(formatKgAmount(62.5), "62.5 kg");
    assert.equal(formatRepCount(1), "1 rep");
    assert.equal(formatRepCount(5), "5 reps");
    assert.equal(formatBodyweightMultiple(2), "2.0");
    assert.equal(formatBodyweightMultiple(1.25), "1.25");
    assert.equal(formatMilestoneTarget(definition()), "100 kg × 5 reps");
    assert.equal(
      formatMilestoneTarget(definition({ milestoneType: "bodyweight_multiple", bodyweightMultiple: 1.5 })),
      "1.5× bodyweight",
    );
    assert.equal(formatGoalGap(12.5), "12.5 kg to go");
    assert.equal(formatBestSet(80, 5), "Best set: 80 kg × 5 reps");
  });

  it("notices a change to the exercise, type, target, multiple, or reps", () => {
    const before = definition();
    assert.equal(milestoneDefinitionChanged(before, definition()), false);
    assert.equal(milestoneDefinitionChanged(before, definition({ minReps: 3 })), true);
    assert.equal(milestoneDefinitionChanged(before, definition({ targetWeightKg: 100.004 })), false);
  });
});

describe("parseGoalForm", () => {
  it("requires an exercise, whole reps, and a target inside the limit", () => {
    assert.deepEqual(parseGoalForm(goalInput({ exerciseId: " " })), {
      ok: false,
      message: "Please select an exercise.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ minReps: "1.5" })), {
      ok: false,
      message: "Please enter a valid reps value.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ targetWeightKg: "0" })), {
      ok: false,
      message: "Please enter a target above 0 kg.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ targetWeightKg: "10000" })), {
      ok: false,
      message: "Please enter a target of 9999.99 kg or less.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ milestoneType: "bodyweight_multiple", bodyweightMultiple: "0" })), {
      ok: false,
      message: "Please enter a multiple above 0.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ milestoneType: "bodyweight_multiple", bodyweightMultiple: "100" })), {
      ok: false,
      message: "Please enter a multiple of 99.99 or less.",
    });
  });

  it("rejects a bad due date or a note over 500 characters", () => {
    assert.deepEqual(parseGoalForm(goalInput({ dueOn: "14 Oct" })), {
      ok: false,
      message: "Please enter a valid due date.",
    });
    assert.deepEqual(parseGoalForm(goalInput({ note: "x".repeat(501) })), {
      ok: false,
      message: "Please enter a note of 500 characters or fewer.",
    });
    const parsed = parseGoalForm(goalInput({ dueOn: "2026-12-01", note: "  keep the pause  " }));
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.dueOn, "2026-12-01");
      assert.equal(parsed.note, "keep the pause");
      assert.equal(parsed.definition.targetWeightKg, 100);
    }
  });
});

describe("resolveMilestone", () => {
  it("stays active with the gap until a qualifying set reaches the target", () => {
    const active = resolveMilestone({
      definition: definition(),
      stored: emptyStored,
      sets: [set({ totalKg: 80, reps: 4 }), set({ totalKg: 90, isWarmup: true })],
      bodyweightKg: null,
      dueOn: "2026-10-01",
      today: "2026-10-14",
      recalculate: false,
    });
    assert.equal(active.progress.kind, "active");
    if (active.progress.kind === "active") {
      assert.equal(active.progress.gapKg, 100);
      assert.equal(active.progress.bestTotalKg, null);
      assert.equal(active.progress.pastDue, true);
    }
    assert.equal(active.shouldWrite, false);

    const reached = resolveMilestone({
      definition: definition(),
      stored: emptyStored,
      sets: [set({ totalKg: 100, performedAt: "2026-10-10T12:00:00Z" })],
      bodyweightKg: null,
      dueOn: null,
      today: "2026-10-14",
      recalculate: false,
    });
    assert.equal(reached.progress.kind, "achieved");
    assert.equal(reached.stored.achievedAt, "2026-10-10T12:00:00Z");
    assert.equal(reached.shouldWrite, true);
  });

  it("keeps a stored achievement until the goal changes", () => {
    const stored: StoredAchievement = {
      achievedAt: "2026-09-01T12:00:00Z",
      achievedBodyweightKg: null,
      achievedThresholdKg: 100,
    };
    const kept = resolveMilestone({
      definition: definition(),
      stored,
      sets: [],
      bodyweightKg: null,
      dueOn: "2026-08-01",
      today: "2026-10-14",
      recalculate: false,
    });
    assert.equal(kept.progress.kind, "achieved");
    assert.equal(kept.shouldWrite, false);
    if (kept.progress.kind === "achieved") {
      assert.equal(kept.progress.pastDue, false);
    }
  });

  it("asks for a bodyweight before scoring a multiple", () => {
    const missing = resolveMilestone({
      definition: definition({
        milestoneType: "bodyweight_multiple",
        targetWeightKg: null,
        bodyweightMultiple: 1.5,
      }),
      stored: {
        achievedAt: "2026-09-01T12:00:00Z",
        achievedBodyweightKg: 80,
        achievedThresholdKg: 120,
      },
      sets: [],
      bodyweightKg: null,
      dueOn: null,
      today: "2026-10-14",
      recalculate: true,
    });
    assert.deepEqual(missing.progress, { kind: "missing_bodyweight", pastDue: false });
    assert.equal(missing.stored.achievedAt, null);
    assert.equal(missing.shouldWrite, true);
  });
});
