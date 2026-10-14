import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { toExerciseBadge } from "./exercise-badge";

describe("toExerciseBadge", () => {
  it("uses the short names for the main lifts", () => {
    assert.equal(toExerciseBadge("deadlift"), "DL");
    assert.equal(toExerciseBadge("romanian-deadlift"), "RDL");
    assert.equal(toExerciseBadge("back-squat"), "SQ");
    assert.equal(toExerciseBadge("goblet-squat"), "SQ");
    assert.equal(toExerciseBadge("barbell-bench-press"), "BP");
    assert.equal(toExerciseBadge("close-grip-bench-press"), "BP");
    assert.equal(toExerciseBadge("overhead-press"), "OHP");
    assert.equal(toExerciseBadge("dumbbell-seated-shoulder-press"), "OHP");
  });

  it("matches movement words before falling back to initials", () => {
    assert.equal(toExerciseBadge("barbell-bent-over-row"), "ROW");
    assert.equal(toExerciseBadge("lat-pulldown"), "PD");
    assert.equal(toExerciseBadge("ez-bar-curl"), "CURL");
    assert.equal(toExerciseBadge("cable-tricep-kickback"), "TRI");
    assert.equal(toExerciseBadge("dumbbell-walking-lunge"), "LNG");
    assert.equal(toExerciseBadge("barbell-hip-thrust"), "HT");
    assert.equal(toExerciseBadge("plank"), "PLK");
    assert.equal(toExerciseBadge("bicycle-crunch"), "CR");
    assert.equal(toExerciseBadge("standing-calf-raise"), "SCR");
    assert.equal(toExerciseBadge(""), "EX");
  });
});
