import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  enterKeyHintForField,
  isEnterChainField,
  resolveEnterInField,
} from "./form-enter-key";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("resolveEnterInField", () => {
  it("moves Enter to the next field", () => {
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: false, fieldCount: 3, activeIndex: 0 }),
      { type: "next", index: 1 },
    );
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: false, fieldCount: 3, activeIndex: 1 }),
      { type: "next", index: 2 },
    );
  });

  it("submits on Enter in the last field, including a form with one field", () => {
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: false, fieldCount: 3, activeIndex: 2 }),
      { type: "submit" },
    );
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: false, fieldCount: 1, activeIndex: 0 }),
      { type: "submit" },
    );
  });

  it("ignores Shift+Enter, other keys, and a field outside the chain", () => {
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: true, fieldCount: 2, activeIndex: 0 }),
      { type: "ignore" },
    );
    assert.deepEqual(
      resolveEnterInField({ key: "Tab", shiftKey: false, fieldCount: 2, activeIndex: 0 }),
      { type: "ignore" },
    );
    assert.deepEqual(
      resolveEnterInField({ key: "Enter", shiftKey: false, fieldCount: 2, activeIndex: -1 }),
      { type: "ignore" },
    );
  });
});

describe("enterKeyHintForField", () => {
  it("offers Next until the last field, which offers to submit", () => {
    assert.equal(enterKeyHintForField(0, 3), "next");
    assert.equal(enterKeyHintForField(1, 3), "next");
    assert.equal(enterKeyHintForField(2, 3), "go");
    assert.equal(enterKeyHintForField(0, 1), "go");
  });
});

describe("isEnterChainField", () => {
  it("includes number, decimal, and date fields and skips notes, search, and buttons", () => {
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "number" }), true);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "text" }), true);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "date" }), true);
    assert.equal(isEnterChainField({ tagName: "SELECT" }), true);
    assert.equal(isEnterChainField({ tagName: "TEXTAREA" }), false);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "search" }), false);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "checkbox" }), false);
    assert.equal(isEnterChainField({ tagName: "BUTTON" }), false);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "number", disabled: true }), false);
    assert.equal(isEnterChainField({ tagName: "INPUT", type: "text", readOnly: true }), false);
  });
});

describe("Enter key wiring", () => {
  it("puts Create goal, Set targets, and set logging on the Enter chain", () => {
    const goal = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "goals", "goal-editor-dialog.tsx"),
      "utf8",
    );
    const targets = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "sessions", "[id]", "session-targets-sheet.tsx"),
      "utf8",
    );
    const inlineTargets = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "sessions", "[id]", "session-exercise-block.tsx"),
      "utf8",
    );
    const sets = readFileSync(
      path.join(repoRoot, "evo-lift", "app", "sessions", "[id]", "session-set-form.tsx"),
      "utf8",
    );

    assert.match(goal, /EnterNextForm/);
    assert.match(goal, /type="submit"/);
    assert.match(targets, /EnterNextForm/);
    assert.match(targets, /type="submit"/);
    assert.match(inlineTargets, /EnterNextForm/);
    assert.match(sets, /EnterNextForm/);
    assert.match(sets, /enterNextHandlers/);
  });
});
