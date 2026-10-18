import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { toExerciseBadge } from "./exercise-badge";

describe("toExerciseBadge", () => {
  it("uses the short names for the main lifts", () => {
    assert.equal(toExerciseBadge("deadlift"), "DL");
    assert.equal(toExerciseBadge("sumo-deadlift"), "DL");
    assert.equal(toExerciseBadge("trap-bar-deadlift"), "DL");
    assert.equal(toExerciseBadge("barbell-romanian-deadlift"), "RDL");
    assert.equal(toExerciseBadge("dumbbell-romanian-deadlift"), "RDL");
    assert.equal(toExerciseBadge("back-squat"), "SQ");
    assert.equal(toExerciseBadge("front-squat"), "SQ");
    assert.equal(toExerciseBadge("goblet-squat"), "SQ");
    assert.equal(toExerciseBadge("hack-squat"), "SQ");
    assert.equal(toExerciseBadge("barbell-bench-press"), "BP");
    assert.equal(toExerciseBadge("barbell-incline-press"), "BP");
    assert.equal(toExerciseBadge("dumbbell-bench-press"), "BP");
    assert.equal(toExerciseBadge("close-grip-bench-press"), "BP");
    assert.equal(toExerciseBadge("overhead-press"), "OHP");
    assert.equal(toExerciseBadge("dumbbell-overhead-press"), "OHP");
    assert.equal(toExerciseBadge("dumbbell-seated-shoulder-press"), "OHP");
    assert.equal(toExerciseBadge("arnold-press"), "OHP");
  });

  it("matches movement words before falling back to initials", () => {
    assert.equal(toExerciseBadge("barbell-bent-over-row"), "ROW");
    assert.equal(toExerciseBadge("lat-pulldown"), "PD");
    assert.equal(toExerciseBadge("pull-up"), "PU");
    assert.equal(toExerciseBadge("chin-up"), "PU");
    assert.equal(toExerciseBadge("assisted-pull-up"), "PU");
    assert.equal(toExerciseBadge("ez-bar-curl"), "CURL");
    assert.equal(toExerciseBadge("cable-tricep-kickback"), "TRI");
    assert.equal(toExerciseBadge("dumbbell-walking-lunge"), "LNG");
    assert.equal(toExerciseBadge("bulgarian-split-squat"), "LNG");
    assert.equal(toExerciseBadge("barbell-hip-thrust"), "HT");
    assert.equal(toExerciseBadge("glute-bridge"), "HT");
    assert.equal(toExerciseBadge("plank"), "PLK");
    assert.equal(toExerciseBadge("pallof-press"), "PLK");
    assert.equal(toExerciseBadge("bicycle-crunch"), "CR");
    assert.equal(toExerciseBadge("push-up"), "PSH");
    assert.equal(toExerciseBadge("standing-calf-raise"), "SCR");
    assert.equal(toExerciseBadge(""), "EX");
  });
});
