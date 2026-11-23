import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { overallLevelFacts } from "./overall-level-facts";

describe("overallLevelFacts", () => {
  it("names sex, age, and bodyweight in the same words as Settings", () => {
    assert.deepEqual(
      overallLevelFacts({ sex: "male", ageYears: 30, ageIsApproximate: false, bodyweightKg: 75 }),
      [
        { label: "Sex", value: "Male" },
        { label: "Age", value: "30" },
        { label: "Bodyweight", value: "75.0 kg" },
      ],
    );
  });

  it("leaves a metric empty when it is missing, and says About when age is a birth year", () => {
    assert.deepEqual(
      overallLevelFacts({ sex: null, ageYears: 34, ageIsApproximate: true, bodyweightKg: null }),
      [
        { label: "Sex", value: null },
        { label: "Age", value: "About 34" },
        { label: "Bodyweight", value: null },
      ],
    );
  });
});
