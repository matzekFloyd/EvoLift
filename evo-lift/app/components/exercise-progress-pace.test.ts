import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  exerciseProgressPaceBuckets,
  exerciseProgressPaceChartLabel,
  exerciseProgressPaceTextRows,
  exerciseProgressPaceTotalLabel,
} from "./exercise-progress-pace";

describe("exercise progress pace buckets", () => {
  it("returns no buckets when there are no rows", () => {
    assert.deepEqual(exerciseProgressPaceBuckets([]), []);
    assert.match(exerciseProgressPaceChartLabel([]), /No exercise progress/);
  });

  it("counts only buckets in use, in list order, with percentages", () => {
    const buckets = exerciseProgressPaceBuckets([
      { read: "ahead" },
      { read: "room" },
      { read: "on-track" },
      { read: "room" },
      { read: "early" },
    ]);

    assert.deepEqual(
      buckets.map((bucket) => ({
        read: bucket.read,
        label: bucket.label,
        count: bucket.count,
        percent: bucket.percent,
      })),
      [
        { read: "room", label: "Room to gain", count: 2, percent: 40 },
        { read: "on-track", label: "On track", count: 1, percent: 20 },
        { read: "ahead", label: "Ahead", count: 1, percent: 20 },
        { read: "early", label: "More sessions", count: 1, percent: 20 },
      ],
    );
    assert.match(exerciseProgressPaceChartLabel(buckets), /2 Room to gain \(40%\)/);
    assert.doesNotMatch(exerciseProgressPaceChartLabel(buckets), /Down/);
    assert.deepEqual(exerciseProgressPaceTextRows(buckets), [
      { read: "room", label: "Room to gain", countLabel: "2 (40%)" },
      { read: "on-track", label: "On track", countLabel: "1 (20%)" },
      { read: "ahead", label: "Ahead", countLabel: "1 (20%)" },
      { read: "early", label: "More sessions", countLabel: "1 (20%)" },
    ]);
    assert.equal(exerciseProgressPaceTotalLabel(5), "5 lifts");
    assert.equal(exerciseProgressPaceTotalLabel(1), "1 lift");
  });

  it("keeps a single bucket readable at 100%", () => {
    const buckets = exerciseProgressPaceBuckets([{ read: "on-track" }, { read: "on-track" }]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0]?.percent, 100);
    assert.equal(buckets[0]?.count, 2);
    assert.equal(buckets[0]?.label, "On track");
  });
});
