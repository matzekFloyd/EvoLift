import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveSessionSheetFocusCycle } from "./session-bottom-sheet-focus";

describe("resolveSessionSheetFocusCycle", () => {
  it("wraps Tab from the last control to the first", () => {
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 3,
        activeIndex: 2,
      }),
      { action: "focus", index: 0 },
    );
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Tab",
        shiftKey: true,
        focusableCount: 3,
        activeIndex: 0,
      }),
      { action: "focus", index: 2 },
    );
  });

  it("wraps Shift+Tab when focus is outside the sheet controls", () => {
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Tab",
        shiftKey: true,
        focusableCount: 2,
        activeIndex: -1,
      }),
      { action: "focus", index: 1 },
    );
  });

  it("prevents Tab when there are no focusable controls", () => {
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 0,
        activeIndex: -1,
      }),
      { action: "prevent" },
    );
  });

  it("ignores non-Tab keys and mid-list Tab", () => {
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Escape",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: 0,
      }),
      { action: "none" },
    );
    assert.deepEqual(
      resolveSessionSheetFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 3,
        activeIndex: 1,
      }),
      { action: "none" },
    );
  });
});
