import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseProgressReport,
  estimateEpley1Rm,
  progressReadLabel,
  type LifterProfile,
} from "./exercise-progress-insights";
import type { ExerciseWorkingSetSample } from "./insights-data";

const RANGE = { from: "2026-01-01", to: "2026-03-01" };
const NO_PROFILE: LifterProfile = {
  sex: null,
  bodyweightKg: null,
  bodyweightEntries: [],
  ageYears: null,
  ageIsApproximate: false,
};

function sample(overrides: Partial<ExerciseWorkingSetSample> = {}): ExerciseWorkingSetSample {
  return {
    exerciseId: "ex-squat",
    slug: "back-squat",
    label: "Barbell Back Squat",
    sessionId: "s1",
    performedOn: "2026-01-01",
    reps: 1,
    loadedKg: 100,
    totalKg: 100,
    ...overrides,
  };
}

describe("estimateEpley1Rm", () => {
  it("keeps a single and estimates 2 to 12 reps", () => {
    assert.equal(estimateEpley1Rm(100, 1), 100);
    assert.equal(estimateEpley1Rm(100, 5), 100 * (1 + 5 / 30));
    assert.equal(estimateEpley1Rm(100, 12), 100 * (1 + 12 / 30));
  });

  it("leaves out loads and rep counts that would drift", () => {
    assert.equal(estimateEpley1Rm(0, 5), null);
    assert.equal(estimateEpley1Rm(100, 0), null);
    assert.equal(estimateEpley1Rm(100, 13), null);
    assert.equal(estimateEpley1Rm(Number.NaN, 5), null);
  });
});

describe("buildExerciseProgressReport", () => {
  it("asks for more history before judging one session", () => {
    const report = buildExerciseProgressReport([sample()], RANGE, NO_PROFILE);
    assert.equal(report.rows[0]?.read, "early");
    assert.equal(progressReadLabel("early"), "More sessions");
    assert.equal(
      report.summary,
      "Log the same exercise on at least 3 sessions, spread over 2 weeks, to judge progress.",
    );
  });

  it("marks a drop of 2.5 kg or more as down", () => {
    const report = buildExerciseProgressReport(
      [
        sample({ sessionId: "s1", performedOn: "2026-01-01", totalKg: 100 }),
        sample({ sessionId: "s2", performedOn: "2026-01-15", totalKg: 100 }),
        sample({ sessionId: "s3", performedOn: "2026-02-01", totalKg: 90 }),
      ],
      RANGE,
      NO_PROFILE,
    );
    assert.equal(report.rows[0]?.read, "down");
    assert.match(report.summary, /Barbell Back Squat is down/);
  });

  it("marks a large squat gain as ahead of a steady rate", () => {
    const report = buildExerciseProgressReport(
      [
        sample({ sessionId: "s1", performedOn: "2026-01-01", totalKg: 100 }),
        sample({ sessionId: "s2", performedOn: "2026-01-15", totalKg: 110 }),
        sample({ sessionId: "s3", performedOn: "2026-02-01", totalKg: 140 }),
      ],
      RANGE,
      NO_PROFILE,
    );
    assert.equal(report.rows[0]?.read, "ahead");
    assert.match(report.rows[0]?.detail ?? "", /1\.5 kg per month/);
  });

  it("does not use assisted-dip or assisted-pull-up assistance as a strength estimate", () => {
    for (const slug of ["assisted-dip", "assisted-pull-up"] as const) {
      const label = slug === "assisted-dip" ? "Assisted Dip" : "Assisted Pull-Up";
      const report = buildExerciseProgressReport(
        [
          sample({ slug, label, sessionId: "s0", performedOn: "2026-01-01", totalKg: 0, loadedKg: 0, reps: 8 }),
          sample({ slug, label, sessionId: "s1", performedOn: "2026-01-01" }),
          sample({ slug, label, sessionId: "s2", performedOn: "2026-01-20" }),
          sample({ slug, label, sessionId: "s3", performedOn: "2026-02-10" }),
        ],
        RANGE,
        NO_PROFILE,
      );
      assert.equal(report.rows[0]?.read, "early");
      assert.equal(report.rows[0]?.bestE1rmKg, null);
      assert.match(report.rows[0]?.detail ?? "", /assistance, not the load/);
    }
  });

  it("grades a published lift when sex, age, and bodyweight are present", () => {
    const report = buildExerciseProgressReport([sample({ totalKg: 100, reps: 1 })], RANGE, {
      sex: "male",
      bodyweightKg: 80,
      bodyweightEntries: [],
      ageYears: 30,
      ageIsApproximate: false,
    });
    assert.equal(report.publicNotes[0]?.badge, "Novice");
    assert.match(report.publicNotes[0]?.tableHref ?? "", /exrx\.net/);
  });

  it("explains when a public comparison is unavailable", () => {
    const samples = [sample()];
    const underage = buildExerciseProgressReport(samples, RANGE, {
      sex: "female",
      bodyweightKg: 60,
      bodyweightEntries: [],
      ageYears: 17,
      ageIsApproximate: false,
    });
    assert.equal(
      underage.comparisonHint,
      "Public standards here start at age 18, so no general-public level is shown.",
    );
    const missing = buildExerciseProgressReport(samples, RANGE, NO_PROFILE);
    assert.match(missing.comparisonHint ?? "", /Add sex, date of birth, and bodyweight/);
  });

  it("grades each lift with the bodyweight on or before its best session", () => {
    const report = buildExerciseProgressReport(
      [
        sample({ sessionId: "squat", performedOn: "2026-01-01", totalKg: 100, reps: 1 }),
        sample({
          exerciseId: "ex-deadlift",
          slug: "deadlift",
          label: "Barbell Deadlift",
          sessionId: "deadlift",
          performedOn: "2026-02-01",
          totalKg: 100,
          reps: 1,
        }),
        sample({
          exerciseId: "ex-press",
          slug: "overhead-press",
          label: "Barbell Overhead Press",
          sessionId: "press",
          performedOn: "2025-12-01",
          totalKg: 40,
          reps: 1,
        }),
      ],
      { from: "2025-12-01", to: "2026-03-01" },
      {
        sex: "male",
        bodyweightKg: 90,
        bodyweightEntries: [
          { loggedOn: "2026-01-01", bodyweightKg: 80 },
          { loggedOn: "2026-02-01", bodyweightKg: 100 },
        ],
        ageYears: 30,
        ageIsApproximate: false,
      },
    );
    const squat = report.publicNotes.find((note) => note.title === "Barbell Back Squat");
    const deadlift = report.publicNotes.find((note) => note.title === "Barbell Deadlift");
    const press = report.publicNotes.find((note) => note.title === "Barbell Overhead Press");
    assert.match(squat?.meta ?? "", /1\.3× bodyweight/);
    assert.match(deadlift?.meta ?? "", /1\.0× bodyweight/);
    assert.equal(press, undefined);
  });

  it("keeps a missing-pattern note and does not list body parts as not trained", () => {
    const bench = (sessionId: string, performedOn: string) =>
      sample({
        exerciseId: "ex-bench",
        slug: "barbell-bench-press",
        label: "Barbell Bench Press",
        sessionId,
        performedOn,
        totalKg: 80,
        reps: 5,
      });
    const report = buildExerciseProgressReport(
      [bench("s1", "2026-01-01"), bench("s2", "2026-01-15"), bench("s3", "2026-02-01")],
      RANGE,
      NO_PROFILE,
    );
    const pattern = report.balanceNotes.find((note) => note.id === "pattern-horizontal-press-horizontal-pull");
    assert.equal(pattern?.badge, "Missing");
    assert.match(pattern?.detail ?? "", /horizontal pull/);
    assert.equal(
      report.balanceNotes.some((note) => note.badge === "Not trained" || note.title === "Arms" || note.title === "Legs"),
      false,
    );
    assert.equal(report.publicNotes.some((note) => note.badge === "Not trained"), false);
  });
});
