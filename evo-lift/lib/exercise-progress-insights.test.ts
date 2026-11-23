import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildExerciseProgressReport,
  estimateEpley1Rm,
  progressReadLabel,
  type LifterProfile,
} from "./exercise-progress-insights";
import type { ExerciseWorkingSetSample } from "./insights-data";
import { overallLevelProgressNote } from "./overall-level-detail";

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
    assert.equal(progressReadLabel("early"), "No pace yet");
    assert.equal(report.rows[0]?.detail, "1 session with an estimated 1RM.");
    assert.equal(
      report.summary,
      "Log the same exercise on at least 3 sessions, spread over 2 weeks, before a pace shows.",
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
    assert.match(report.rows[0]?.detail ?? "", /Best in this range was/);
    assert.doesNotMatch(report.rows[0]?.detail ?? "", /Over /);
    assert.doesNotMatch(report.rows[0]?.detail ?? "", /Latest estimated 1RM/);
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
    assert.match(report.rows[0]?.detail ?? "", /A steady rate for this lift is about 1\.5 kg per month/);
    assert.doesNotMatch(report.rows[0]?.detail ?? "", /Over /);
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
    assert.equal(report.publicNotes[0]?.detail, "");
    assert.match(report.standardsCaption ?? "", /ExRx.net standards for men, ages 18–39/);
    assert.match(report.publicNotes[0]?.tableHref ?? "", /exrx\.net/);
  });

  it("still grades a published lift when date of birth is missing", () => {
    const report = buildExerciseProgressReport([sample({ totalKg: 100, reps: 1 })], RANGE, {
      sex: "male",
      bodyweightKg: 80,
      bodyweightEntries: [],
      ageYears: null,
      ageIsApproximate: false,
    });
    assert.equal(report.publicNotes[0]?.badge, "Novice");
    assert.match(report.comparisonHint ?? "", /Add a date of birth/);
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

  it("counts plate-loaded presses with the same movement as the pin-loaded machine", () => {
    const press = (sessionId: string, performedOn: string) =>
      sample({
        exerciseId: "ex-plate-chest",
        slug: "plate-loaded-chest-press",
        label: "Plate-Loaded Chest Press",
        sessionId,
        performedOn,
        totalKg: 80,
        reps: 5,
      });
    const report = buildExerciseProgressReport(
      [press("s1", "2026-01-01"), press("s2", "2026-01-15"), press("s3", "2026-02-01")],
      RANGE,
      NO_PROFILE,
    );
    const pattern = report.balanceNotes.find((note) => note.id === "pattern-horizontal-press-horizontal-pull");
    assert.equal(pattern?.badge, "Missing");
    assert.equal(pattern?.title, "Plate-Loaded Chest Press");
  });

  it("averages the main lifts when 3 of 4 are inside the last 8 weeks", () => {
    const profile: LifterProfile = {
      sex: "male",
      bodyweightKg: 75,
      bodyweightEntries: [],
      ageYears: 30,
      ageIsApproximate: false,
    };
    const main = (
      slug: string,
      label: string,
      totalKg: number,
      performedOn: string,
    ): ExerciseWorkingSetSample =>
      sample({
        exerciseId: `ex-${slug}`,
        slug,
        label,
        sessionId: slug,
        performedOn,
        totalKg,
        reps: 1,
      });
    const recent = [
      main("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
      main("barbell-bench-press", "Barbell Bench Press", 70, "2026-02-01"),
      main("deadlift", "Barbell Deadlift", 185, "2026-02-01"),
    ];
    const stalePress = main("overhead-press", "Barbell Overhead Press", 32.5, "2026-01-03");
    const machine = sample({
      exerciseId: "ex-curl",
      slug: "ez-bar-curl",
      label: "EZ-Bar Curl",
      sessionId: "curl",
      performedOn: "2026-02-01",
      totalKg: 200,
      reps: 1,
    });
    const report = buildExerciseProgressReport([...recent, stalePress, machine], RANGE, profile);
    assert.equal(report.publicNotes.find((note) => note.titleSlug === "back-squat")?.badge, "Elite");
    assert.equal(report.publicNotes.find((note) => note.titleSlug === "barbell-bench-press")?.badge, "Novice");
    assert.equal(report.publicNotes.find((note) => note.titleSlug === "deadlift")?.badge, "Advanced");
    assert.equal(report.publicNotes.find((note) => note.titleSlug === "overhead-press")?.badge, "Untrained");
    assert.equal(report.overallLevel?.badge, "Advanced");
    assert.match(report.overallLevel?.detail ?? "", /each count the same/);
    assert.match(report.overallLevel?.detail ?? "", /Barbell Overhead Press is outside the last 8 weeks/);
    assert.equal(report.overallLevel?.meta, "3 of 4 main lifts in the last 8 weeks.");
    assert.equal(report.overallLevel?.source, "ExRx.net standards for men, ages 18–39.");
    assert.equal(report.standardsCaption, "ExRx.net standards for men, ages 18–39.");
    assert.equal(report.overallLevel?.lifts.find((lift) => lift.slug === "back-squat")?.influence, "pulls-up");
    assert.equal(
      report.overallLevel?.lifts.find((lift) => lift.slug === "barbell-bench-press")?.influence,
      "holds-back",
    );
    assert.equal(report.overallLevel?.lifts.find((lift) => lift.slug === "deadlift")?.influence, "matches");
    assert.equal(report.overallLevel?.lifts.find((lift) => lift.slug === "overhead-press")?.influence, "left-out");
    assert.equal(report.overallLevel?.progress.nextLabel, "Elite");
    assert.equal(report.overallLevel?.history.at(-1)?.badge, "Advanced");
  });

  it("keeps the overall level provisional until 3 main lifts are recent", () => {
    const profile: LifterProfile = {
      sex: "male",
      bodyweightKg: 75,
      bodyweightEntries: [],
      ageYears: 30,
      ageIsApproximate: false,
    };
    const lift = (slug: string, label: string, totalKg: number, performedOn: string) =>
      sample({
        exerciseId: `ex-${slug}`,
        slug,
        label,
        sessionId: `${slug}-${performedOn}`,
        performedOn,
        totalKg,
        reps: 1,
      });
    const onTheBoundary = buildExerciseProgressReport(
      [
        lift("back-squat", "Barbell Back Squat", 112.5, "2026-01-04"),
        lift("barbell-bench-press", "Barbell Bench Press", 85, "2026-01-04"),
        lift("deadlift", "Barbell Deadlift", 135, "2026-01-04"),
      ],
      RANGE,
      profile,
    );
    assert.equal(onTheBoundary.overallLevel?.badge, "Intermediate");
    assert.equal(onTheBoundary.publicNotes[0]?.badge, "Intermediate");

    const oneDayOlder = buildExerciseProgressReport(
      [
        lift("back-squat", "Barbell Back Squat", 112.5, "2026-01-04"),
        lift("barbell-bench-press", "Barbell Bench Press", 85, "2026-01-04"),
        lift("deadlift", "Barbell Deadlift", 135, "2026-01-03"),
      ],
      RANGE,
      profile,
    );
    assert.equal(oneDayOlder.publicNotes.find((note) => note.titleSlug === "deadlift")?.badge, "Intermediate");
    assert.equal(oneDayOlder.overallLevel?.badge, "Provisional");
    assert.match(oneDayOlder.overallLevel?.detail ?? "", /at least 3 of the 4 main barbell lifts/);
    assert.equal(oneDayOlder.overallLevel?.meta, "2 of 4 main lifts in the last 8 weeks.");
  });

  it("counts all 4 main lifts from the best inside the last 8 weeks", () => {
    const profile: LifterProfile = {
      sex: "male",
      bodyweightKg: 75,
      bodyweightEntries: [],
      ageYears: 30,
      ageIsApproximate: false,
    };
    const lift = (slug: string, label: string, totalKg: number, performedOn: string) =>
      sample({
        exerciseId: `ex-${slug}`,
        slug,
        label,
        sessionId: `${slug}-${performedOn}`,
        performedOn,
        totalKg,
        reps: 1,
      });
    const samples = [
      lift("back-squat", "Barbell Back Squat", 202.5, "2026-02-01"),
      lift("barbell-bench-press", "Barbell Bench Press", 70, "2026-02-01"),
      lift("deadlift", "Barbell Deadlift", 185, "2026-02-01"),
      lift("overhead-press", "Barbell Overhead Press", 32.5, "2026-02-01"),
      lift("overhead-press", "Barbell Overhead Press", 80, "2025-06-01"),
    ];
    const allHistory = buildExerciseProgressReport(samples, { from: "", to: "2026-03-01" }, profile);
    const lastEightWeeks = buildExerciseProgressReport(
      samples,
      { from: "2026-01-04", to: "2026-03-01" },
      profile,
    );
    assert.equal(allHistory.overallLevel?.badge, lastEightWeeks.overallLevel?.badge);
    assert.equal(allHistory.overallLevel?.meta, "4 of 4 main lifts in the last 8 weeks.");
    assert.equal(lastEightWeeks.overallLevel?.meta, "4 of 4 main lifts in the last 8 weeks.");
    assert.equal(allHistory.overallLevel?.badge, "Intermediate");
    assert.equal(allHistory.overallLevel?.progress.fraction, 0.5);
    assert.match(
      overallLevelProgressNote({
        badge: allHistory.overallLevel?.badge ?? "",
        progress: allHistory.overallLevel?.progress ?? { fraction: null, nextLabel: null },
        lifts: allHistory.overallLevel?.lifts ?? [],
      }) ?? "",
      /Barbell Bench Press and Barbell Overhead Press are still short of Advanced/,
    );
    assert.deepEqual(allHistory.overallLevel?.progress, lastEightWeeks.overallLevel?.progress);
    assert.deepEqual(
      allHistory.overallLevel?.lifts.map((liftRow) => ({
        slug: liftRow.slug,
        level: liftRow.level,
        influence: liftRow.influence,
      })),
      lastEightWeeks.overallLevel?.lifts.map((liftRow) => ({
        slug: liftRow.slug,
        level: liftRow.level,
        influence: liftRow.influence,
      })),
    );
    assert.equal(
      allHistory.overallLevel?.lifts.find((liftRow) => liftRow.slug === "overhead-press")?.level,
      "Untrained",
    );
    assert.notEqual(
      allHistory.overallLevel?.lifts.find((liftRow) => liftRow.slug === "overhead-press")?.influence,
      "left-out",
    );
  });
});
