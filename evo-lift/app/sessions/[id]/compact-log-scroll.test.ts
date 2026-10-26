import { describe, expect, it } from "vitest";
import { compactLogScrollDelta, compactLogShellPaddingClass } from "./compact-log-scroll";

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

  it("leaves a clear gap above the sticky bar when no gap is given", () => {
    expect(
      compactLogScrollDelta({
        viewportHeight: 800,
        stickyHeight: 140,
        topInset: 0,
        actionTop: 560,
        actionBottom: 700,
        lastRowTop: 460,
      }),
    ).toBe(64);
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

describe("compactLogShellPaddingClass", () => {
  it("clears the two-row bar while logging", () => {
    expect(compactLogShellPaddingClass(false)).toBe(
      "max-md:!pb-[calc(7.5rem+1px+1.25rem+max(0.75rem,env(safe-area-inset-bottom,0px)))]",
    );
  });

  it("adds the filled Finish row so the last control can scroll clear", () => {
    expect(compactLogShellPaddingClass(true)).toBe(
      "max-md:!pb-[calc(7.5rem+1px+1.25rem+2.75rem+0.375rem+max(0.75rem,env(safe-area-inset-bottom,0px)))]",
    );
  });
});
