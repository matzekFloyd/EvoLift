import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { goalMeterValueText, goalMeterVisible, goalMeterWidth } from "./goal-meter";

describe("goal progress meter", () => {
  it("shows the track only while a measured goal is still short of its target", () => {
    assert.equal(goalMeterVisible({ percent: 41, achieved: false }), true);
    assert.equal(goalMeterVisible({ percent: 0, achieved: false }), true);
    assert.equal(goalMeterVisible({ percent: 100, achieved: true }), false);
    assert.equal(goalMeterVisible({ percent: null, achieved: false }), false);
  });

  it("keeps the track inside 0–100 and empty when bodyweight is missing", () => {
    assert.equal(goalMeterWidth(null), 0);
    assert.equal(goalMeterWidth(Number.NaN), 0);
    assert.equal(goalMeterWidth(-4), 0);
    assert.equal(goalMeterWidth(42), 42);
    assert.equal(goalMeterWidth(140), 100);
  });

  it("names the status with the percent", () => {
    assert.equal(
      goalMeterValueText({ percent: null, pastDue: false, achieved: false }),
      "Needs bodyweight",
    );
    assert.equal(
      goalMeterValueText({ percent: null, pastDue: true, achieved: false }),
      "Past due. Needs bodyweight",
    );
    assert.equal(
      goalMeterValueText({ percent: 54, pastDue: true, achieved: false }),
      "Past due, 54%",
    );
    assert.equal(
      goalMeterValueText({ percent: 100, pastDue: false, achieved: true }),
      "Achieved, 100%",
    );
    assert.equal(
      goalMeterValueText({ percent: 41, pastDue: false, achieved: false }),
      "41%",
    );
  });
});
