import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DEFAULT_MAIN_LIFT_STAGNATION_WEEKS,
  MAIN_LIFT_STAGNATION_WEEKS_ERROR,
  mainLiftStagnationMessage,
  mainLiftStagnationWeeksError,
  mainLiftStagnationWeeksFromStored,
  parseMainLiftStagnationWeeks,
  stagnantMainLifts,
  type MainLiftStagnationSeries,
} from "./main-lift-stagnation";

function squat(points: Array<{ performedOn: string; e1rmKg: number }>): MainLiftStagnationSeries {
  return { slug: "back-squat", shortLabel: "Squat", points };
}

describe("stagnantMainLifts", () => {
  it("flags a main lift whose best estimate is at least N weeks before the latest session", () => {
    const stalled = stagnantMainLifts(
      [squat([
        { performedOn: "2026-01-01", e1rmKg: 140 },
        { performedOn: "2026-02-12", e1rmKg: 140 },
      ])],
      6,
    );
    assert.deepEqual(stalled, [{ slug: "back-squat", shortLabel: "Squat", weeksSinceBest: 6 }]);
  });

  it("stays quiet one day short of N weeks", () => {
    const stalled = stagnantMainLifts(
      [squat([
        { performedOn: "2026-01-01", e1rmKg: 140 },
        { performedOn: "2026-02-11", e1rmKg: 139 },
      ])],
      6,
    );
    assert.deepEqual(stalled, []);
  });

  it("clears once a later session is higher by 0.1 kg", () => {
    const stalled = stagnantMainLifts(
      [squat([
        { performedOn: "2026-01-01", e1rmKg: 140 },
        { performedOn: "2026-03-01", e1rmKg: 140.06 },
      ])],
      6,
    );
    assert.deepEqual(stalled, []);
  });

  it("treats a rise under 0.1 kg as no improvement", () => {
    const stalled = stagnantMainLifts(
      [squat([
        { performedOn: "2026-01-01", e1rmKg: 140 },
        { performedOn: "2026-02-26", e1rmKg: 140.04 },
      ])],
      6,
    );
    assert.equal(stalled.length, 1);
    assert.equal(stalled[0]?.weeksSinceBest, 8);
  });

  it("ignores a lift with one session", () => {
    assert.deepEqual(
      stagnantMainLifts([squat([{ performedOn: "2026-01-01", e1rmKg: 100 }])], 6),
      [],
    );
  });

  it("keeps the first day the best estimate was hit", () => {
    const stalled = stagnantMainLifts(
      [squat([
        { performedOn: "2026-01-01", e1rmKg: 130 },
        { performedOn: "2026-01-15", e1rmKg: 150 },
        { performedOn: "2026-02-26", e1rmKg: 150 },
      ])],
      6,
    );
    assert.equal(stalled[0]?.weeksSinceBest, 6);
  });
});

describe("mainLiftStagnationMessage", () => {
  it("names one lift, several lifts, and a single week", () => {
    assert.equal(
      mainLiftStagnationMessage([{ shortLabel: "Squat" }], 6),
      "Squat estimated 1RM has not improved for 6 weeks.",
    );
    assert.equal(
      mainLiftStagnationMessage([{ shortLabel: "Squat" }, { shortLabel: "Bench" }], 6),
      "Squat and Bench estimated 1RM have not improved for 6 weeks.",
    );
    assert.equal(
      mainLiftStagnationMessage(
        [{ shortLabel: "Squat" }, { shortLabel: "Bench" }, { shortLabel: "Deadlift" }],
        1,
      ),
      "Squat, Bench, and Deadlift estimated 1RM have not improved for 1 week.",
    );
    assert.equal(mainLiftStagnationMessage([], 6), null);
  });
});

describe("main lift stagnation weeks setting", () => {
  it("accepts 1 to 52 and falls back to the default otherwise", () => {
    assert.equal(parseMainLiftStagnationWeeks("6"), 6);
    assert.equal(parseMainLiftStagnationWeeks("1"), 1);
    assert.equal(parseMainLiftStagnationWeeks("52"), 52);
    assert.equal(parseMainLiftStagnationWeeks("0"), null);
    assert.equal(parseMainLiftStagnationWeeks("53"), null);
    assert.equal(parseMainLiftStagnationWeeks("6.5"), null);
    assert.equal(parseMainLiftStagnationWeeks(""), null);
    assert.equal(mainLiftStagnationWeeksFromStored(null), DEFAULT_MAIN_LIFT_STAGNATION_WEEKS);
    assert.equal(mainLiftStagnationWeeksFromStored(undefined), DEFAULT_MAIN_LIFT_STAGNATION_WEEKS);
    assert.equal(mainLiftStagnationWeeksFromStored(0), DEFAULT_MAIN_LIFT_STAGNATION_WEEKS);
    assert.equal(mainLiftStagnationWeeksFromStored(6.5), DEFAULT_MAIN_LIFT_STAGNATION_WEEKS);
    assert.equal(mainLiftStagnationWeeksFromStored(8), 8);
    assert.equal(mainLiftStagnationWeeksError(""), MAIN_LIFT_STAGNATION_WEEKS_ERROR);
    assert.equal(mainLiftStagnationWeeksError("8"), null);
  });
});
