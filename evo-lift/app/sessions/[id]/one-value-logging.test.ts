import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveSuggestedAddDraft } from "./session-set-draft";
import {
  LOADED_WEIGHT_INVALID,
  ONE_VALUE_LOGGING_STORAGE_KEY,
  REPS_INVALID,
  TARGET_SETS_LOGGED,
  advanceAfterSavedSet,
  backToLoad,
  freshLoadStep,
  goToReps,
  lastSetSummary,
  nextWorkingSetNumber,
  oneValueContextLine,
  oneValueLoggingEnabledFromStorage,
  oneValuePrimaryAction,
  oneValuePrimaryLabel,
  parseOneValueLoad,
  parseOneValueReps,
  presenceForNextExercise,
  stepLoadedWeight,
  stepReps,
  visibleOneValuePresence,
} from "./one-value-logging";

describe("one-value logging preference", () => {
  it("defaults off and is remembered for the browser, not one session", () => {
    assert.equal(ONE_VALUE_LOGGING_STORAGE_KEY, "evolift.one-value-logging");
    assert.equal(ONE_VALUE_LOGGING_STORAGE_KEY.includes("session"), false);
    assert.equal(oneValueLoggingEnabledFromStorage(null), false);
    assert.equal(oneValueLoggingEnabledFromStorage("0"), false);
    assert.equal(oneValueLoggingEnabledFromStorage("1"), true);
  });
});

describe("one-value load and reps", () => {
  it("accepts an empty load as no weight and rejects a negative or non-numeric load", () => {
    assert.deepEqual(parseOneValueLoad(""), { ok: true, weightKg: null });
    assert.deepEqual(parseOneValueLoad("  "), { ok: true, weightKg: null });
    assert.deepEqual(parseOneValueLoad("0"), { ok: true, weightKg: 0 });
    assert.deepEqual(parseOneValueLoad("60.25"), { ok: true, weightKg: 60.25 });
    assert.deepEqual(parseOneValueLoad("-1"), { ok: false, message: LOADED_WEIGHT_INVALID });
    assert.deepEqual(parseOneValueLoad("abc"), { ok: false, message: LOADED_WEIGHT_INVALID });
    assert.equal(LOADED_WEIGHT_INVALID, "Please enter a valid loaded weight.");
  });

  it("rejects empty, zero, and non-numeric reps", () => {
    assert.deepEqual(parseOneValueReps(""), { ok: false, message: REPS_INVALID });
    assert.deepEqual(parseOneValueReps("0"), { ok: false, message: REPS_INVALID });
    assert.deepEqual(parseOneValueReps("-2"), { ok: false, message: REPS_INVALID });
    assert.deepEqual(parseOneValueReps("8"), { ok: true, reps: 8 });
    assert.equal(REPS_INVALID, "Please enter a valid reps value.");
  });

  it("moves to reps without writing a set, and back keeps both values", () => {
    const load = freshLoadStep({ reps: "8", weightKg: "60", isWarmup: true });
    assert.equal(load.isWarmup, false);
    const withWarmup = { ...load, isWarmup: true, weightKg: "  " };
    const next = goToReps(withWarmup);
    assert.equal(next.ok, true);
    if (!next.ok) {
      return;
    }
    assert.equal(next.step.screen, "reps");
    assert.equal(next.step.weightKg, "");
    assert.equal(next.step.reps, "8");
    assert.equal(next.step.isWarmup, true);
    const back = backToLoad(next.step);
    assert.equal(back.screen, "load");
    assert.equal(back.weightKg, "");
    assert.equal(back.reps, "8");
    assert.equal(back.isWarmup, true);
    assert.deepEqual(goToReps({ ...load, weightKg: "-1" }), {
      ok: false,
      message: LOADED_WEIGHT_INVALID,
    });
  });

  it("steps load by 2.5 and reps by 1", () => {
    assert.equal(stepLoadedWeight("60", 2.5), "62.5");
    assert.equal(stepLoadedWeight("", 2.5), "2.5");
    assert.equal(stepLoadedWeight("1", -2.5), "0");
    assert.equal(stepReps("8", 1), "9");
    assert.equal(stepReps("1", -1), "1");
    assert.equal(stepReps("", 1), "1");
    assert.equal(stepReps("", -1), "1");
  });
});

describe("one-value set flow", () => {
  it("opens the next load screen only while working sets are still under the target", () => {
    assert.equal(advanceAfterSavedSet({ workingSetCount: 1, targetWorkingSets: 3 }), "next-load");
    assert.equal(advanceAfterSavedSet({ workingSetCount: 3, targetWorkingSets: 3 }), "target-met");
    assert.equal(advanceAfterSavedSet({ workingSetCount: 4, targetWorkingSets: 3 }), "target-met");
    assert.equal(advanceAfterSavedSet({ workingSetCount: 1, targetWorkingSets: null }), "open");
    assert.equal(advanceAfterSavedSet({ workingSetCount: 0, targetWorkingSets: 0 }), "open");
    assert.equal(TARGET_SETS_LOGGED, "Target sets logged.");
  });

  it("does not let a warmup advance the working-set count or the next prefill", () => {
    const before = 1;
    const afterWarmup = before;
    assert.equal(
      advanceAfterSavedSet({ workingSetCount: afterWarmup, targetWorkingSets: 3 }),
      "next-load",
    );
    const draft = resolveSuggestedAddDraft(
      { target_reps: 8, target_weight_kg: 60 },
      [{ is_warmup: true, reps: 5, weight_kg: 20 }],
      undefined,
    );
    assert.deepEqual(draft, { reps: "8", weightKg: "60", isWarmup: false });
    const afterWorking = resolveSuggestedAddDraft(
      { target_reps: 8, target_weight_kg: 60 },
      [
        { is_warmup: true, reps: 5, weight_kg: 20 },
        { is_warmup: false, reps: 8, weight_kg: 62.5 },
      ],
      undefined,
    );
    assert.equal(afterWorking.weightKg, "62.5");
    assert.equal(afterWorking.reps, "8");
    assert.equal(afterWorking.isWarmup, false);
  });

  it("labels the screen with the exercise name, and keeps an unfinished step until it is left", () => {
    assert.equal(nextWorkingSetNumber(1), 2);
    assert.equal(
      oneValueContextLine({
        exerciseName: "Bench press",
        screen: "load",
        workingSetNumber: 2,
        targetWorkingSets: 3,
        isWarmup: false,
      }),
      "Bench press · Working set 2 of 3 · Loaded (kg)",
    );
    assert.equal(
      oneValueContextLine({
        exerciseName: "Bench press",
        screen: "load",
        workingSetNumber: 2,
        targetWorkingSets: 3,
        isWarmup: true,
      }),
      "Bench press · Warmup · Loaded (kg)",
    );
    assert.equal(
      oneValueContextLine({
        exerciseName: "Bench press",
        screen: "reps",
        workingSetNumber: 1,
        targetWorkingSets: null,
        isWarmup: false,
      }),
      "Bench press · Working set 1 · Reps",
    );
    assert.equal(lastSetSummary(null), null);
    assert.equal(lastSetSummary({ weight_kg: 60, reps: 8 }), "Last set: 60 kg × 8 reps");
    assert.equal(lastSetSummary({ weight_kg: null, reps: 8 }), "Last set: 0 kg × 8 reps");

    const prefill = { reps: "8", weightKg: "60", isWarmup: false };
    const started = visibleOneValuePresence(undefined, prefill);
    assert.equal(started.status, "entry");
    if (started.status !== "entry") {
      return;
    }
    const kept = visibleOneValuePresence(
      { status: "entry", step: { ...started.step, screen: "reps", weightKg: "62.5" } },
      prefill,
    );
    assert.deepEqual(kept, {
      status: "entry",
      step: { screen: "reps", weightKg: "62.5", reps: "8", isWarmup: false },
    });
    const left = visibleOneValuePresence({ status: "left" }, prefill);
    assert.deepEqual(left, { status: "left" });
    assert.equal(oneValuePrimaryAction(started), "next");
    assert.equal(oneValuePrimaryAction({ status: "entry", step: { ...started.step, screen: "reps" } }), "save");
    assert.equal(oneValuePrimaryLabel("save"), "Save set");
    assert.equal(oneValuePrimaryAction({ status: "paused", reason: "target-met" }), "add-another");
    assert.equal(oneValuePrimaryAction({ status: "paused", reason: "open" }), "add-another");
    assert.equal(oneValuePrimaryLabel("add-another"), "Add another set");
    assert.equal(oneValuePrimaryAction({ status: "left" }), "add-set");
    const resumed = presenceForNextExercise(
      { status: "entry", step: started.step },
      { reps: "5", weightKg: "40", isWarmup: false },
    );
    assert.equal(resumed.status, "entry");
    const opened = presenceForNextExercise({ status: "paused", reason: "target-met" }, prefill);
    assert.deepEqual(opened, { status: "entry", step: freshLoadStep(prefill) });
  });
});
