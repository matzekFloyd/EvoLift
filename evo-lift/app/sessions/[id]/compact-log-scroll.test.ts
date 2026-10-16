import { describe, expect, it } from "vitest";
import { compactLogScrollDelta } from "./compact-log-scroll";

const view = { viewportHeight: 800, stickyHeight: 140, topInset: 0, gap: 12 };

describe("compactLogScrollDelta", () => {
  it("scrolls down until the next action sits above the sticky bar", () => {
    expect(
      compactLogScrollDelta({
        ...view,
        actionTop: 560,
        actionBottom: 700,
        lastRowTop: 460,
      }),
    ).toBe(52);
  });

  it("stops early so the last row stays on screen", () => {
    expect(
      compactLogScrollDelta({
        ...view,
        actionTop: 560,
        actionBottom: 700,
        lastRowTop: 40,
      }),
    ).toBe(28);
  });

  it("does not scroll when the action and the last row already fit", () => {
    expect(
      compactLogScrollDelta({
        ...view,
        actionTop: 500,
        actionBottom: 600,
        lastRowTop: 400,
      }),
    ).toBe(0);
  });

  it("scrolls to the action when there is no last row", () => {
    expect(
      compactLogScrollDelta({
        ...view,
        actionTop: 700,
        actionBottom: 760,
        lastRowTop: null,
      }),
    ).toBe(112);
  });
});
