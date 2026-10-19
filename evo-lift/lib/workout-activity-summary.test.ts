import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatDateToYyyyMmDd } from "./session-date";
import {
  activityIntensity,
  activityIntensityClass,
  activityIntensityLabel,
  activityIntensityPhrase,
  buildActivityComparison,
  buildActivityComparisonSentence,
  type ActivityDay,
} from "./workout-activity-summary";

function ymd(date: Date): string {
  return formatDateToYyyyMmDd(date);
}

function mondayOf(date: Date): Date {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

describe("activity intensity", () => {
  it("marks rest, a session with no sets, or a day a workout was done", () => {
    assert.equal(activityIntensity(0, 0), "rest");
    assert.equal(activityIntensity(0, 1), "no-sets");
    assert.equal(activityIntensity(4, 1), "workout");
    assert.equal(activityIntensity(13, 1), "workout");
    assert.equal(activityIntensityLabel("rest"), "No Workout");
    assert.equal(activityIntensityLabel("no-sets"), "No Sets");
    assert.equal(activityIntensityLabel("workout"), "Workout");
    assert.equal(activityIntensityClass("workout"), "bg-sky-600");
    assert.equal(activityIntensityClass("rest"), "bg-zinc-100");
    assert.equal(activityIntensityClass("no-sets"), "bg-zinc-400");
    assert.equal(activityIntensityPhrase("rest"), "No workout.");
    assert.equal(activityIntensityPhrase("workout"), "A workout was done.");
    assert.equal(
      activityIntensityPhrase("no-sets"),
      "An upcoming workout has no exercises logged yet.",
    );
  });
});

describe("buildActivityComparisonSentence", () => {
  it("returns nothing when there are no days", () => {
    assert.equal(buildActivityComparisonSentence([], "2026-10-14"), "");
  });

  it("compares this week with last week when last Monday is in the data", () => {
    const today = new Date();
    const lastMonday = mondayOf(today);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const days: ActivityDay[] = [
      { date: ymd(lastMonday), workouts: 1, sets: 4 },
      { date: ymd(today), workouts: 1, sets: 7 },
    ];
    const comparison = buildActivityComparison(days, ymd(today));
    assert.equal(comparison.sentence, "1 session and 7 sets this week, 3 more sets than last week.");
    assert.equal(comparison.setTrend, "up");
    assert.equal(buildActivityComparisonSentence(days, ymd(today)), comparison.sentence);
  });

  it("points down for fewer sets and marks an equal count as the same", () => {
    const today = new Date();
    const lastMonday = mondayOf(today);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const fewer: ActivityDay[] = [
      { date: ymd(lastMonday), workouts: 1, sets: 7 },
      { date: ymd(today), workouts: 1, sets: 4 },
    ];
    assert.equal(buildActivityComparison(fewer, ymd(today)).setTrend, "down");
    const same: ActivityDay[] = [
      { date: ymd(lastMonday), workouts: 1, sets: 4 },
      { date: ymd(today), workouts: 1, sets: 4 },
    ];
    assert.equal(buildActivityComparison(same, ymd(today)).setTrend, "same");
  });

  it("names last week when this week has no sessions yet", () => {
    const today = new Date();
    const lastMonday = mondayOf(today);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const days: ActivityDay[] = [
      { date: ymd(lastMonday), workouts: 2, sets: 6 },
      { date: ymd(today), workouts: 0, sets: 0 },
    ];
    assert.equal(
      buildActivityComparisonSentence(days, ymd(today)),
      "No sessions this week yet. Last week was 2 sessions and 6 sets.",
    );
    assert.equal(buildActivityComparison(days, ymd(today)).setTrend, null);
  });
});
