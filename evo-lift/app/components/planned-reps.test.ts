import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parsePlannedReps } from "./planned-reps";

describe("planned reps", () => {
  it("accepts a positive number and ignores a blank or invalid value", () => {
    assert.equal(parsePlannedReps("  5 "), 5);
    assert.equal(parsePlannedReps(""), null);
    assert.equal(parsePlannedReps("0"), null);
    assert.equal(parsePlannedReps("nope"), null);
  });
});
