import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PersonalBestSetSample } from "./personal-bests";
import {
  buildProfileRecords,
  formatProfileEstimated1Rm,
  profileBestWeightLabel,
  profileRecordSharedDate,
  sortProfileAchievedGoals,
  type ProfileAchievedGoal,
} from "./profile-summary";

function sample(
  partial: Partial<PersonalBestSetSample> &
    Pick<PersonalBestSetSample, "exerciseId" | "slug" | "label" | "performedOn" | "reps" | "loadedKg" | "totalKg">,
): PersonalBestSetSample {
  return partial;
}

describe("profile records", () => {
  it("keeps the heaviest Loaded (kg) and the best estimated 1RM, with the earlier date on a tie", () => {
    const rows = buildProfileRecords([
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        label: "Barbell Back Squat",
        performedOn: "2026-03-01",
        reps: 5,
        loadedKg: 100,
        totalKg: 120,
      }),
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        label: "Barbell Back Squat",
        performedOn: "2026-04-01",
        reps: 3,
        loadedKg: 110,
        totalKg: 130,
      }),
      sample({
        exerciseId: "squat",
        slug: "back-squat",
        label: "Barbell Back Squat",
        performedOn: "2026-02-01",
        reps: 3,
        loadedKg: 110,
        totalKg: 130,
      }),
      sample({
        exerciseId: "bench",
        slug: "barbell-bench-press",
        label: "Barbell Bench Press",
        performedOn: "2026-01-15",
        reps: 15,
        loadedKg: 60,
        totalKg: 80,
      }),
    ]);

    assert.deepEqual(
      rows.map((row) => row.label),
      ["Barbell Back Squat", "Barbell Bench Press"],
    );
    const squat = rows[0];
    assert.equal(squat?.bestWeight?.valueKg, 110);
    assert.equal(squat?.bestWeight?.performedOn, "2026-02-01");
    assert.equal(squat?.bestE1rm?.performedOn, "2026-02-01");
    assert.ok(squat?.bestE1rm != null && squat.bestE1rm.valueKg > 130);
    assert.equal(formatProfileEstimated1Rm(squat?.bestE1rm?.valueKg ?? null), "143.0 kg");
    assert.equal(rows[1]?.bestE1rm, null);
    assert.equal(formatProfileEstimated1Rm(null), "—");
    assert.equal(profileBestWeightLabel(false), "Best weight");
    assert.equal(profileRecordSharedDate(squat ?? { bestWeight: null, bestE1rm: null }) != null, true);
  });

  it("leaves estimated 1RM empty for an assisted set until a bodyweight covers that day", () => {
    const sets = [
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        label: "Assisted Dip",
        performedOn: "2026-05-01",
        reps: 5,
        loadedKg: 20,
        totalKg: 20,
      }),
      sample({
        exerciseId: "dip",
        slug: "assisted-dip",
        label: "Assisted Dip",
        performedOn: "2026-06-01",
        reps: 5,
        loadedKg: 10,
        totalKg: 10,
      }),
    ];
    const withoutBodyweight = buildProfileRecords(sets);
    assert.equal(withoutBodyweight[0]?.bestWeight?.valueKg, 10);
    assert.equal(withoutBodyweight[0]?.bestWeight?.performedOn, "2026-06-01");
    assert.equal(withoutBodyweight[0]?.bestE1rm, null);
    assert.equal(profileBestWeightLabel(true), "Least assistance");

    const withBodyweight = buildProfileRecords(sets, [{ loggedOn: "2026-05-20", bodyweightKg: 80 }]);
    assert.equal(withBodyweight[0]?.bestE1rm?.performedOn, "2026-06-01");
    assert.equal(formatProfileEstimated1Rm(withBodyweight[0]?.bestE1rm?.valueKg ?? null), "81.7 kg");
  });

  it("estimates a dip from bodyweight plus added load", () => {
    const rows = buildProfileRecords(
      [
        sample({
          exerciseId: "dip",
          slug: "dip",
          label: "Dip",
          performedOn: "2026-07-01",
          reps: 1,
          loadedKg: 10,
          totalKg: 10,
        }),
      ],
      [{ loggedOn: "2026-06-01", bodyweightKg: 80 }],
    );
    assert.equal(rows[0]?.bestWeight?.valueKg, 10);
    assert.equal(rows[0]?.bestE1rm?.valueKg, 90);
  });
});

describe("profile achieved goals", () => {
  it("lists the newest achievement first and breaks a date tie by exercise name", () => {
    const goals: ProfileAchievedGoal[] = [
      {
        id: "older",
        label: "Barbell Deadlift",
        slug: "deadlift",
        href: "/app/exercises/deadlift",
        targetLabel: "1.5× bodyweight",
        achievedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "press",
        label: "Barbell Overhead Press",
        slug: "overhead-press",
        href: "/app/exercises/overhead-press",
        targetLabel: "0.5× bodyweight",
        achievedAt: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "bench",
        label: "Barbell Bench Press",
        slug: "bench",
        href: "/app/exercises/bench",
        targetLabel: "1.0× bodyweight",
        achievedAt: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "open",
        label: "Barbell Back Squat",
        slug: "back-squat",
        href: "/app/exercises/back-squat",
        targetLabel: "1.5× bodyweight",
        achievedAt: null,
      },
    ];

    assert.deepEqual(
      sortProfileAchievedGoals(goals).map((goal) => goal.id),
      ["bench", "press", "older", "open"],
    );
  });
});
