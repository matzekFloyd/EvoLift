import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  accountAgeDisplay,
  exerciseDefaultsFormValues,
  localIsoDate,
} from "./account-profile-form";

describe("localIsoDate", () => {
  it("pads month and day in local time", () => {
    assert.equal(localIsoDate(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(localIsoDate(new Date(2026, 10, 21)), "2026-11-21");
  });
});

describe("accountAgeDisplay", () => {
  const now = new Date(2026, 9, 21);

  it("uses the exact age when a date of birth is set", () => {
    assert.deepEqual(
      accountAgeDisplay({ dateOfBirth: "1990-10-21", birthYearFallback: 1985, now }),
      { exactAge: 36, yearOnlyAge: null },
    );
    assert.deepEqual(
      accountAgeDisplay({ dateOfBirth: " 1990-10-22 ", birthYearFallback: null, now }),
      { exactAge: 35, yearOnlyAge: null },
    );
  });

  it("falls back to the year on file when there is no date of birth", () => {
    assert.deepEqual(accountAgeDisplay({ dateOfBirth: "", birthYearFallback: 1990, now }), {
      exactAge: null,
      yearOnlyAge: 36,
    });
  });

  it("returns nothing when neither is set", () => {
    assert.deepEqual(accountAgeDisplay({ dateOfBirth: "  ", birthYearFallback: null, now }), {
      exactAge: null,
      yearOnlyAge: null,
    });
  });
});

describe("exerciseDefaultsFormValues", () => {
  const saved = {
    user_id: "user-1",
    exercise_id: "ex-1",
    default_base_weight_kg: 20,
    default_target_sets: 3,
    default_target_reps: 8,
    default_target_weight_kg: 62.5,
    suggest_warmups: false,
    suggest_target: false,
    max_suggested_warmup_sets: 2,
    created_at: "",
    updated_at: "",
  };

  it("stringifies saved defaults", () => {
    assert.deepEqual(exerciseDefaultsFormValues({ saved, exerciseId: "ex-1", slug: "back-squat" }), {
      baseWeightKg: "20",
      targetSets: "3",
      targetReps: "8",
      targetWeightKg: "62.5",
      suggestWarmups: false,
      suggestTarget: false,
      maxWarmupSets: "2",
    });
  });

  it("clears fields and suggests warmups for a compound lift with nothing saved", () => {
    assert.deepEqual(
      exerciseDefaultsFormValues({ saved: undefined, exerciseId: "ex-1", slug: "back-squat" }),
      {
        baseWeightKg: "",
        targetSets: "",
        targetReps: "",
        targetWeightKg: "",
        suggestWarmups: true,
        suggestTarget: true,
        maxWarmupSets: "",
      },
    );
  });

  it("does not suggest warmups for a non-compound lift with nothing saved", () => {
    assert.equal(
      exerciseDefaultsFormValues({ saved: undefined, exerciseId: "ex-1", slug: "cable-curl" })
        .suggestWarmups,
      false,
    );
  });

  it("defaults suggest warmups to yes when no exercise is selected", () => {
    assert.equal(
      exerciseDefaultsFormValues({ saved: undefined, exerciseId: "", slug: undefined }).suggestWarmups,
      true,
    );
  });
});
