import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  isIosPlatform,
  isKeyboardTextEntry,
  keyboardOverlapPx,
  publishedKeyboardOverlapPx,
  scrollDeltaToRevealField,
} from "./keyboard-overlap";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("keyboardOverlapPx", () => {
  it("stays at 0 when the layout viewport already matches the visible area", () => {
    assert.equal(keyboardOverlapPx({ innerHeight: 800, visualHeight: 800, visualOffsetTop: 0 }), 0);
  });

  it("reports the keyboard when the visual viewport shrinks", () => {
    assert.equal(keyboardOverlapPx({ innerHeight: 800, visualHeight: 500, visualOffsetTop: 0 }), 300);
  });

  it("subtracts a pan so the sheet is not lifted twice", () => {
    assert.equal(keyboardOverlapPx({ innerHeight: 800, visualHeight: 500, visualOffsetTop: 100 }), 200);
  });

  it("ignores a short gap from browser chrome", () => {
    assert.equal(keyboardOverlapPx({ innerHeight: 800, visualHeight: 760, visualOffsetTop: 0 }), 0);
  });

  it("ignores a non-finite measurement", () => {
    assert.equal(
      keyboardOverlapPx({ innerHeight: Number.NaN, visualHeight: 500, visualOffsetTop: 0 }),
      0,
    );
  });
});

describe("publishedKeyboardOverlapPx", () => {
  it("does not offset iOS, which already pins fixed sheets to the visual viewport", () => {
    const keyboard = { innerHeight: 800, visualHeight: 500, visualOffsetTop: 0 };
    assert.equal(
      publishedKeyboardOverlapPx({
        ...keyboard,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        maxTouchPoints: 5,
      }),
      0,
    );
    assert.equal(
      publishedKeyboardOverlapPx({
        ...keyboard,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 5,
      }),
      0,
    );
    assert.equal(
      publishedKeyboardOverlapPx({
        ...keyboard,
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120.0.0.0 Mobile",
        maxTouchPoints: 5,
      }),
      300,
    );
  });
});

describe("isIosPlatform", () => {
  it("treats a Mac without touch as a desktop", () => {
    assert.equal(
      isIosPlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        maxTouchPoints: 0,
      }),
      false,
    );
  });
});

describe("isKeyboardTextEntry", () => {
  it("includes the set-target number fields and skips buttons", () => {
    assert.equal(isKeyboardTextEntry({ tagName: "INPUT", type: "number" }), true);
    assert.equal(isKeyboardTextEntry({ tagName: "TEXTAREA" }), true);
    assert.equal(isKeyboardTextEntry({ tagName: "SELECT" }), true);
    assert.equal(isKeyboardTextEntry({ tagName: "INPUT", type: "checkbox" }), false);
    assert.equal(isKeyboardTextEntry({ tagName: "BUTTON" }), false);
  });
});

describe("scrollDeltaToRevealField", () => {
  it("leaves a field that is already in view", () => {
    assert.equal(
      scrollDeltaToRevealField({
        scrollTop: 0,
        containerHeight: 200,
        fieldOffsetTop: 40,
        fieldHeight: 40,
        margin: 12,
      }),
      0,
    );
  });

  it("centers a field that sits below the visible sheet", () => {
    assert.equal(
      scrollDeltaToRevealField({
        scrollTop: 0,
        containerHeight: 200,
        fieldOffsetTop: 400,
        fieldHeight: 40,
        margin: 12,
      }),
      320,
    );
  });

  it("returns 0 when the scroller has no height yet", () => {
    assert.equal(
      scrollDeltaToRevealField({
        scrollTop: 0,
        containerHeight: 0,
        fieldOffsetTop: 40,
        fieldHeight: 40,
        margin: 12,
      }),
      0,
    );
  });
});

describe("keyboard inset wiring", () => {
  it("shrinks the layout viewport and lifts sheets and dialogs by the published overlap", () => {
    const layout = readFileSync(path.join(repoRoot, "evo-lift", "app", "layout.tsx"), "utf8");
    const sheet = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "sessions", "[id]", "session-bottom-sheet.tsx"),
      "utf8",
    );
    const dialog = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "components", "app-dialog.tsx"),
      "utf8",
    );
    const java = readFileSync(
      path.join(repoRoot, "android", "app", "src", "main", "java", "app", "evolift", "MainActivity.java"),
      "utf8",
    );

    assert.match(layout, /interactiveWidget:\s*"resizes-content"/);
    assert.match(sheet, /keyboardOverlapBottom/);
    assert.match(sheet, /keyboardAwareMaxHeight/);
    assert.match(sheet, /data-sheet-body/);
    assert.match(dialog, /dialogKeyboardPaddingBottom/);
    assert.match(java, /WindowInsetsCompat\.Type\.ime\(\)/);
    assert.match(java, /webViewBottomMargin\(/);
  });
});
