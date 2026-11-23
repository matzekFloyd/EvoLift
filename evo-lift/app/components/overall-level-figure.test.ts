import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { EXRX_LEVELS } from "@/lib/strength-standards";
import {
  LEVEL_BODY_LEVELS,
  chestReach,
  levelFigure,
  markedOverallLevel,
  musclesFitFigure,
  shoulderBreadth,
} from "./overall-level-figure";

describe("overall level figures", () => {
  it("draws the five ExRx levels and leaves out the below-untrained rating", () => {
    assert.deepEqual(LEVEL_BODY_LEVELS, ["Untrained", "Novice", "Intermediate", "Advanced", "Elite"]);
    assert.equal(markedOverallLevel("Under the untrained mark"), null);
    assert.equal(markedOverallLevel("Provisional"), null);
    assert.equal(markedOverallLevel(null), null);
    assert.equal(markedOverallLevel("Elite"), "Elite");
  });

  it("keeps the head one size and makes each higher level broader, not just thicker", () => {
    const heads = EXRX_LEVELS.map((level) => levelFigure(level).head);
    assert.equal(new Set(heads).size, 1);
    const breadth = LEVEL_BODY_LEVELS.map((level) => shoulderBreadth(level));
    const reach = LEVEL_BODY_LEVELS.map((level) => chestReach(level));
    for (let index = 1; index < breadth.length; index += 1) {
      assert.ok(breadth[index] - breadth[index - 1] >= 6);
      assert.ok(reach[index] > reach[index - 1]);
    }
    for (const level of LEVEL_BODY_LEVELS) {
      const figure = levelFigure(level);
      assert.equal((figure.body.match(/M/g) ?? []).length, 1);
      assert.equal(figure.body.endsWith("Z"), true);
      assert.ok(figure.seams.length >= 3);
      assert.equal(musclesFitFigure(level), true);
    }
    const untrained = levelFigure("Untrained");
    const elite = levelFigure("Elite");
    assert.ok(elite.shoulderBreadth > untrained.shoulderBreadth * 1.6);
    assert.ok(elite.armThickness > untrained.armThickness * 2);
    assert.ok(elite.thighThickness > untrained.thighThickness + 5);
    assert.ok(elite.forearmThickness / elite.armThickness < untrained.forearmThickness / untrained.armThickness);
    assert.ok(elite.thighThickness - untrained.thighThickness > elite.calfThickness - untrained.calfThickness + 2);
    assert.equal(musclesFitFigure("Under the untrained mark"), true);
  });
});
