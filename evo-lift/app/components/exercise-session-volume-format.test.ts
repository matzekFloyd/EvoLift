import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatVolumeTick } from "./exercise-session-volume-format";

describe("session volume axis", () => {
  it("compacts thousands and leaves a non-number blank", () => {
    assert.equal(formatVolumeTick(Number.NaN), "");
    assert.equal(formatVolumeTick(12), "12");
    assert.equal(formatVolumeTick(12.4), "12");
    assert.equal(formatVolumeTick(1500), "1.5k");
  });
});
