import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { shouldShowSetSummarySeparator } from "./compact-set-summary";

describe("shouldShowSetSummarySeparator", () => {
  it("keeps the dot when the set number and load fit on one line", () => {
    assert.equal(
      shouldShowSetSummarySeparator({
        containerWidth: 320,
        setWidth: 96,
        loadWidth: 110,
        separatorWidth: 6,
        gap: 6,
      }),
      true,
    );
  });

  it("drops the dot when the load wraps under the set number", () => {
    assert.equal(
      shouldShowSetSummarySeparator({
        containerWidth: 180,
        setWidth: 110,
        loadWidth: 120,
        separatorWidth: 6,
        gap: 6,
      }),
      false,
    );
  });

  it("treats a subpixel shortfall as still fitting", () => {
    assert.equal(
      shouldShowSetSummarySeparator({
        containerWidth: 200,
        setWidth: 90,
        loadWidth: 91.4,
        separatorWidth: 6,
        gap: 6,
      }),
      true,
    );
  });
});
