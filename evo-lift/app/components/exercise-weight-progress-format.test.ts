import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatKgTick } from "./exercise-weight-progress-format";

describe("weight progress axis", () => {
  it("keeps one decimal under 1000 kg and compacts larger ticks", () => {
    assert.equal(formatKgTick(Number.POSITIVE_INFINITY), "");
    assert.equal(formatKgTick(80), "80");
    assert.equal(formatKgTick(80.25), "80.3");
    assert.equal(formatKgTick(1200), "1.2k");
  });
});
