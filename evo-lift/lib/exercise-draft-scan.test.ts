import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { exerciseDraftScan } from "./exercise-draft-scan";

describe("exercise draft scan", () => {
  it("leads with the lift and lists targets in form order", () => {
    const scan = exerciseDraftScan({
      label: "Barbell Back Squat",
      baseWeightKg: "20",
      targetSets: "4",
      targetWeightKg: "80",
      targetReps: "5",
      usesAssistance: false,
    });
    assert.equal(scan.name, "Barbell Back Squat");
    assert.equal(scan.details, "Base weight 20 kg, 4 sets, Target weight 80 kg, 5 reps");
  });

  it("names assistance instead of target weight and skips base weight", () => {
    const scan = exerciseDraftScan({
      label: "Assisted pull-up",
      baseWeightKg: "20",
      targetSets: "3",
      targetWeightKg: "15",
      targetReps: "8",
      usesAssistance: true,
    });
    assert.equal(scan.details, "3 sets, Target assistance 15 kg, 8 reps");
  });

  it("uses Exercise when no lift is chosen and omits blank targets", () => {
    const scan = exerciseDraftScan({
      label: "  ",
      baseWeightKg: "",
      targetSets: "",
      targetWeightKg: "",
      targetReps: "5",
      usesAssistance: false,
    });
    assert.equal(scan.name, "Exercise");
    assert.equal(scan.details, "5 reps");
  });
});
