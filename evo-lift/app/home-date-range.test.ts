import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getDefaultHomeDateRange } from "./home-date-range";

describe("getDefaultHomeDateRange", () => {
  it("starts one year before today and ends today", () => {
    assert.deepEqual(getDefaultHomeDateRange(new Date(2026, 9, 14)), {
      from: "2025-10-14",
      to: "2026-10-14",
    });
  });

  it("moves Feb 29 back onto March 1 in a non-leap year", () => {
    assert.deepEqual(getDefaultHomeDateRange(new Date(2024, 1, 29)), {
      from: "2023-03-01",
      to: "2024-02-29",
    });
  });
});
