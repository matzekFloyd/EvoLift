import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { LifterProfile } from "@/lib/exercise-progress-insights";
import type { ExerciseWorkingSetSample } from "@/lib/insights-data";
import { sessionLevelUpMessage } from "./session-level-up";

const PROFILE: LifterProfile = {
  sex: "male",
  bodyweightKg: 75,
  bodyweightEntries: [],
  ageYears: 30,
  ageIsApproximate: false,
};

function lift(
  slug: string,
  label: string,
  totalKg: number,
  performedOn: string,
  sessionId: string,
): ExerciseWorkingSetSample {
  return {
    exerciseId: `ex-${slug}`,
    slug,
    label,
    sessionId,
    performedOn,
    reps: 1,
    loadedKg: totalKg,
    totalKg,
  };
}

describe("sessionLevelUpMessage", () => {
  it("hints when the finished session reaches a higher level", () => {
    const early = "2026-01-04";
    const later = "2026-02-01";
    const samples = [
      lift("back-squat", "Barbell Back Squat", 112.5, early, "squat-early"),
      lift("barbell-bench-press", "Barbell Bench Press", 85, early, "bench-early"),
      lift("deadlift", "Barbell Deadlift", 135, early, "dead-early"),
      lift("back-squat", "Barbell Back Squat", 202.5, later, "squat-later"),
      lift("barbell-bench-press", "Barbell Bench Press", 145, later, "bench-later"),
      lift("deadlift", "Barbell Deadlift", 235, later, "dead-later"),
    ];
    assert.equal(
      sessionLevelUpMessage({
        samples,
        hiddenExerciseIds: new Set(),
        profile: PROFILE,
        sessionId: "squat-later",
        today: "2026-03-01",
      }),
      "You reached Elite.",
    );
    assert.equal(
      sessionLevelUpMessage({
        samples: samples.filter((sample) => sample.sessionId !== "dead-later"),
        hiddenExerciseIds: new Set(),
        profile: PROFILE,
        sessionId: "bench-early",
        today: "2026-03-01",
      }),
      null,
    );
  });
});
