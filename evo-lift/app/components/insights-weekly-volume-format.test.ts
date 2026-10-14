import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { formatCompactNumber } from "./insights-weekly-volume-format";

describe("insights weekly volume axis", () => {
  it("rounds smaller values and compacts thousands", () => {
    assert.equal(formatCompactNumber(12.6), "13");
    assert.equal(formatCompactNumber(999), "999");
    assert.equal(formatCompactNumber(1500), "1.5k");
  });
});
