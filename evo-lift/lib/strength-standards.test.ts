import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { classifyExrxLift, exrxTableUrl, isPublicStandardLift } from "./strength-standards";

describe("ExRx standards", () => {
  it("recognizes the four published lifts", () => {
    assert.equal(isPublicStandardLift("deadlift"), true);
    assert.equal(isPublicStandardLift("ez-bar-curl"), false);
    assert.match(exrxTableUrl("back-squat") ?? "", /exrx\.net/);
    assert.equal(exrxTableUrl("ez-bar-curl"), null);
  });

  it("places a 75 kg male squat on the published row", () => {
    assert.equal(classifyExrxLift("back-squat", 49, "male", 75), "Under the untrained mark");
    assert.equal(classifyExrxLift("back-squat", 50, "male", 75), "Untrained");
    assert.equal(classifyExrxLift("back-squat", 92.5, "male", 75), "Novice");
    assert.equal(classifyExrxLift("back-squat", 112.5, "male", 75), "Intermediate");
    assert.equal(classifyExrxLift("back-squat", 155, "male", 75), "Advanced");
    assert.equal(classifyExrxLift("back-squat", 202.5, "male", 75), "Elite");
  });

  it("uses the women's table and the open bodyweight class", () => {
    assert.equal(classifyExrxLift("back-squat", 20, "female", 44), "Untrained");
    assert.equal(classifyExrxLift("back-squat", 20, "male", 44), "Under the untrained mark");
    assert.equal(classifyExrxLift("back-squat", 70, "male", 200), "Untrained");
  });

  it("returns nothing without a lift, a positive estimate, or a positive bodyweight", () => {
    assert.equal(classifyExrxLift("ez-bar-curl", 40, "male", 80), null);
    assert.equal(classifyExrxLift("deadlift", 0, "male", 80), null);
    assert.equal(classifyExrxLift("deadlift", 140, "female", 0), null);
  });
});
