import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { ExerciseWorkingSetSample, UserStrengthProfile } from "@/lib/insights-data";
import { profileOverallLevel, profilePageSummary, showProfileOverallLevel } from "./profile-overall-level";

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
    assert.equal(rated.sex, "male");
    assert.equal(rated.ageYears, 30);
    assert.equal(rated.ageIsApproximate, false);
    assert.equal(rated.bodyweightKg, 75);

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
    assert.equal(showProfileOverallLevel(result), true);
  });

  it("hides the profile level when no main barbell lift is logged", () => {
    const result = profileOverallLevel({
      samples: [lift("ez-bar-curl", "EZ-Bar Curl", 40, "2026-02-01")],
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    assert.equal(result.overall, null);
    assert.equal(result.hint, null);
    assert.equal(showProfileOverallLevel(result), false);
    assert.equal(showProfileOverallLevel(null), false);
    assert.equal(profilePageSummary(false), "Your personal records and latest reached goals.");
    assert.equal(
      profilePageSummary(true),
      "Your overall level, personal records, and latest reached goals.",
    );
  });

  it("keeps a provisional profile level when fewer than 3 main lifts are recent", () => {
    const result = profileOverallLevel({
      samples: [lift("back-squat", "Barbell Back Squat", 140, "2026-02-01")],
      hiddenExerciseIds: new Set(),
      profile: PROFILE,
      today: "2026-03-01",
    });
    assert.equal(result.overall?.badge, "Provisional");
    assert.equal(showProfileOverallLevel(result), true);
  });
});
