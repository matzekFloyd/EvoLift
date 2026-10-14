import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SESSION_DATE_HAS_SETS,
  SESSION_DATE_INVALID,
  SESSION_DATE_REQUIRED,
  findLastWorkingSet,
  parseYyyyMmDdDateOnly,
  resolveSuggestedAddDraft,
  sessionPerformedOnError,
  targetPrefillStringsFromSessionExercise,
} from "./session-set-draft";

describe("parseYyyyMmDdDateOnly", () => {
  it("accepts a real calendar day", () => {
    assert.equal(parseYyyyMmDdDateOnly(" 2026-10-14 "), "2026-10-14");
  });

  it("rejects an empty value, a bad shape, and a day that is not on the calendar", () => {
    assert.equal(parseYyyyMmDdDateOnly("   "), null);
    assert.equal(parseYyyyMmDdDateOnly("2026-1-4"), null);
    assert.equal(parseYyyyMmDdDateOnly("2024-02-31"), null);
    assert.equal(parseYyyyMmDdDateOnly("2023-02-29"), null);
  });
});

describe("sessionPerformedOnError", () => {
  it("asks for a date when the field is empty", () => {
    assert.equal(sessionPerformedOnError("  "), SESSION_DATE_REQUIRED);
  });

  it("asks for YYYY-MM-DD when the date is not a calendar day", () => {
    assert.equal(sessionPerformedOnError("2024-02-31"), SESSION_DATE_INVALID);
  });

  it("accepts a valid performed date", () => {
    assert.equal(sessionPerformedOnError("2026-10-14"), null);
  });

  it("tells you to choose today or earlier when sets are already logged", () => {
    assert.equal(
      SESSION_DATE_HAS_SETS,
      "This session already has logged sets. Choose today or an earlier date.",
    );
  });
});

describe("findLastWorkingSet", () => {
  it("skips warmups and uses the latest working set", () => {
    const last = findLastWorkingSet([
      { is_warmup: false, reps: 5, weight_kg: 60 },
      { is_warmup: true, reps: 8, weight_kg: 40 },
    ]);
    assert.deepEqual(last, { is_warmup: false, reps: 5, weight_kg: 60 });
  });

  it("returns null when every set is a warmup", () => {
    assert.equal(findLastWorkingSet([{ is_warmup: true, reps: 8, weight_kg: 40 }]), null);
  });
});

describe("target prefill and add-set defaults", () => {
  const targets = { target_reps: 5, target_weight_kg: 80 };

  it("uses targets only when no working set exists", () => {
    assert.deepEqual(targetPrefillStringsFromSessionExercise(targets), { reps: "5", weightKg: "80" });
    assert.deepEqual(
      resolveSuggestedAddDraft(targets, [{ is_warmup: true, reps: 10, weight_kg: 20 }], undefined),
      { reps: "5", weightKg: "80", isWarmup: false },
    );
  });

  it("does not invent a target that is missing or not positive", () => {
    assert.deepEqual(
      targetPrefillStringsFromSessionExercise({ target_reps: 0, target_weight_kg: null }),
      { reps: "", weightKg: "" },
    );
  });

  it("copies the last working set and ignores a later warmup", () => {
    assert.deepEqual(
      resolveSuggestedAddDraft(
        targets,
        [
          { is_warmup: false, reps: 5, weight_kg: 82.5 },
          { is_warmup: true, reps: 3, weight_kg: 40 },
        ],
        undefined,
      ),
      { reps: "5", weightKg: "82.5", isWarmup: false },
    );
  });

  it("keeps an in-progress edit", () => {
    assert.deepEqual(
      resolveSuggestedAddDraft(
        targets,
        [{ is_warmup: false, reps: 5, weight_kg: 80 }],
        { reps: "3", isWarmup: true },
      ),
      { reps: "3", weightKg: "80", isWarmup: true },
    );
  });

  it("leaves weight blank when the last working set has no loaded weight", () => {
    assert.equal(
      resolveSuggestedAddDraft(undefined, [{ is_warmup: false, reps: 8, weight_kg: null }], undefined).weightKg,
      "",
    );
  });
});
