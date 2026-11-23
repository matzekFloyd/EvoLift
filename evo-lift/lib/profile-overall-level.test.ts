import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ExerciseWorkingSetSample, UserStrengthProfile } from "@/lib/insights-data";
import { profileOverallLevel } from "./profile-overall-level";

const PROFILE: UserStrengthProfile = {
  sex: "male",
  bodyweightKg: 75,
  bodyweightEntries: [],
  dateOfBirth: "1996-01-01",
  birthYear: null,
};

function lift(slug: string, label: string, totalKg: number, performedOn: string): ExerciseWorkingSetSample {
  return {
    exerciseId: `ex-${slug}`,
    slug,
    label,
    sessionId: slug,
    performedOn,
    reps: 1,
    loadedKg: totalKg,
    totalKg,
  };
}

describe("profileOverallLevel", () => {
  it("rates the main lifts through today and leaves a hidden lift out", () => {
    const samples = [
      lift("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
      lift("barbell-bench-press", "Barbell Bench Press", 70, "2026-02-01"),
      lift("deadlift", "Barbell Deadlift", 185, "2026-02-01"),
      lift("overhead-press", "Barbell Overhead Press", 32.5, "2026-01-03"),
      lift("ez-bar-curl", "EZ-Bar Curl", 40, "2026-02-01"),
    ];
    const rated = profileOverallLevel({
      samples,
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    assert.equal(rated.overall?.badge, "Advanced");

    const hiddenSquat = profileOverallLevel({
      samples,
      hiddenExerciseIds: new Set(["ex-back-squat"]),
      profile: PROFILE,
      today: "2026-03-01",
    });
    assert.equal(hiddenSquat.overall?.badge, "Provisional");
  });

  it("asks for sex and bodyweight before it rates", () => {
    const result = profileOverallLevel({
      samples: [lift("back-squat", "Barbell Back Squat", 100, "2026-02-01")],
      hiddenExerciseIds: new Set(),
      profile: { ...PROFILE, sex: null, bodyweightKg: null },
      today: "2026-03-01",
    });
    assert.equal(result.overall, null);
    assert.match(result.hint ?? "", /Add sex, date of birth, and bodyweight/);
  });
});
