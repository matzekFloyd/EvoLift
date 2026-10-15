import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getDefaultHomeDateRange } from "./home-date-range";

describe("getDefaultHomeDateRange", () => {
  it("starts four weeks before today and ends today", () => {
    assert.deepEqual(getDefaultHomeDateRange(new Date(2026, 9, 14)), {
      from: "2026-09-16",
      to: "2026-10-14",
    });
  });

  it("crosses a month boundary", () => {
    assert.deepEqual(getDefaultHomeDateRange(new Date(2026, 2, 1)), {
      from: "2026-02-01",
      to: "2026-03-01",
    });
  });
});
