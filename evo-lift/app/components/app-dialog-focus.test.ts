import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { resolveDialogFocusCycle, resolveDialogKeyAction } from "./app-dialog-focus";

describe("resolveDialogFocusCycle", () => {
  it("wraps Tab from the last control to the first", () => {
    assert.deepEqual(
      resolveDialogFocusCycle({
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
      resolveDialogFocusCycle({
        key: "Tab",
        shiftKey: true,
        focusableCount: 3,
        activeIndex: 0,
      }),
      { action: "focus", index: 2 },
    );
  });

  it("pulls focus back inside when it starts outside the dialog", () => {
    assert.deepEqual(
      resolveDialogFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: -1,
      }),
      { action: "focus", index: 0 },
    );
    assert.deepEqual(
      resolveDialogFocusCycle({
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
      resolveDialogFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 0,
        activeIndex: -1,
      }),
      { action: "prevent" },
    );
  });

  it("lets Tab move between controls in the middle of the dialog", () => {
    assert.deepEqual(
      resolveDialogFocusCycle({
        key: "Tab",
        shiftKey: false,
        focusableCount: 3,
        activeIndex: 1,
      }),
      { action: "none" },
    );
  });
});

describe("resolveDialogKeyAction", () => {
  it("closes the dialog on Escape", () => {
    assert.deepEqual(
      resolveDialogKeyAction({
        key: "Escape",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: 0,
      }),
      { type: "close" },
    );
  });

  it("leaves Escape to a nested control that already handles it", () => {
    assert.deepEqual(
      resolveDialogKeyAction({
        key: "Escape",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: 1,
        escapeCloses: false,
      }),
      { type: "ignore" },
    );
  });

  it("traps Tab on the last control and ignores other keys", () => {
    assert.deepEqual(
      resolveDialogKeyAction({
        key: "Tab",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: 1,
      }),
      { type: "trap", cycle: { action: "focus", index: 0 } },
    );
    assert.deepEqual(
      resolveDialogKeyAction({
        key: "Enter",
        shiftKey: false,
        focusableCount: 2,
        activeIndex: 0,
      }),
      { type: "ignore" },
    );
  });
});

describe("AppDialog keyboard contract", () => {
  const componentsDir = dirname(fileURLToPath(import.meta.url));

  it("keeps Escape, the focus trap, and return focus in AppDialog", () => {
    const dialog = readFileSync(join(componentsDir, "app-dialog.tsx"), "utf8");
    const activity = readFileSync(join(componentsDir, "activity-day-session-dialog.tsx"), "utf8");
    const history = readFileSync(
      join(componentsDir, "..", "sessions", "[id]", "session-exercise-history-dialog.tsx"),
      "utf8",
    );

    assert.match(dialog, /resolveDialogKeyAction/);
    assert.match(dialog, /previouslyFocused\?\.focus\(\)/);
    assert.match(dialog, /onClose/);
    assert.doesNotMatch(dialog, /onBackdropClick/);
    assert.doesNotMatch(activity, /event\.key === "Escape"/);
    assert.doesNotMatch(history, /event\.key === "Escape"/);
  });
});
