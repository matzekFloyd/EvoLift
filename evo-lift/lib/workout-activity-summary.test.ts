import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatDateToYyyyMmDd } from "./session-date";
import {
  activityIntensity,
  activityIntensityClass,
  activityIntensityLabel,
  activityIntensityPhrase,
  buildActivityComparisonSentence,
  median,
  usualTrainingDaySets,
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
  it("uses the middle value, or the average of the two middle values", () => {
    assert.equal(median([]), null);
    assert.equal(median([9, 1, 3]), 3);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(usualTrainingDaySets([0, 4, 0, 8]), 6);
  });

  it("classifies a day against the usual training-day set count", () => {
    assert.equal(activityIntensity(0, 0, 10), "rest");
    assert.equal(activityIntensity(0, 1, 10), "no-sets");
    assert.equal(activityIntensity(4, 1, null), "usual");
    assert.equal(activityIntensity(7, 1, 10), "lighter");
    assert.equal(activityIntensity(8, 1, 10), "usual");
    assert.equal(activityIntensity(13, 1, 10), "heavier");
    assert.equal(activityIntensityLabel("heavier"), "Heavier");
    assert.equal(activityIntensityClass("rest"), "bg-zinc-100");
    assert.equal(activityIntensityPhrase("no-sets"), "Session logged, no sets.");
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
    assert.equal(
      buildActivityComparisonSentence(days, ymd(today)),
      "1 session and 7 sets this week, 3 more sets than last week.",
    );
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
  });
});
