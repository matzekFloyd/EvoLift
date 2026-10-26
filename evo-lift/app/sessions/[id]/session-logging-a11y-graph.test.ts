import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const sessionDir = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(dirname(dirname(sessionDir)), "components");

describe("session logging keyboard and screen-reader graph", () => {
  it("makes set targets and add-exercise sheets dialogs with Escape and focus cycle", () => {
    const sheet = readFileSync(join(sessionDir, "session-bottom-sheet.tsx"), "utf8");
    const focus = readFileSync(join(sessionDir, "session-bottom-sheet-focus.ts"), "utf8");
    const targets = readFileSync(join(sessionDir, "session-targets-sheet.tsx"), "utf8");
    const addExercise = readFileSync(join(sessionDir, "session-add-exercise.tsx"), "utf8");

    assert.match(sheet, /role="dialog"/);
    assert.match(sheet, /aria-modal="true"/);
    assert.match(sheet, /aria-labelledby=\{titleId\}/);
    assert.match(sheet, /event\.key === "Escape"/);
    assert.match(sheet, /nestedControlHandlesEscape/);
    assert.match(sheet, /cycleSessionSheetFocus/);
    assert.match(sheet, /previouslyFocused\?\.focus/);
    assert.match(sheet, /onCloseRef\.current/);
    assert.doesNotMatch(sheet, /backdropLabel/);
    assert.doesNotMatch(sheet, /role="button"/);

    assert.match(focus, /listSessionSheetFocusable/);
    assert.match(focus, /cycleSessionSheetFocus/);

    assert.match(targets, /SessionBottomSheet title="Set targets"/);
    assert.doesNotMatch(targets, /backdropLabel/);
    assert.match(addExercise, /SessionBottomSheet title="Add exercise"/);
    assert.doesNotMatch(addExercise, /backdropLabel/);
  });

  it("names set logging controls and hides decorative icons from the name", () => {
    const setForm = readFileSync(join(sessionDir, "session-set-form.tsx"), "utf8");
    const compactBar = readFileSync(join(sessionDir, "session-compact-bar.tsx"), "utf8");
    const stickyBar = readFileSync(join(componentsDir, "compact-sticky-bar.tsx"), "utf8");
    const exerciseBlock = readFileSync(join(sessionDir, "session-exercise-block.tsx"), "utf8");
    const addExercise = readFileSync(join(sessionDir, "session-add-exercise.tsx"), "utf8");
    const rowActions = readFileSync(join(componentsDir, "compact-row-actions.tsx"), "utf8");

    assert.match(setForm, /aria-label=\{loadFieldLabel\}/);
    assert.match(setForm, /aria-label="Reps"/);
    assert.match(setForm, /aria-label=\{label\}/);
    assert.match(setForm, /label=\{`Decrease \$\{loadFieldLabel\} by 2\.5`\}/);
    assert.match(setForm, /label=\{`Increase \$\{loadFieldLabel\} by 2\.5`\}/);
    assert.match(setForm, /label="Decrease reps by 1"/);
    assert.match(setForm, /label="Increase reps by 1"/);
    assert.match(setForm, /<Plus className="h-4 w-4 shrink-0" aria-hidden \/>/);
    assert.doesNotMatch(setForm, /text-emerald-600/);

    assert.match(exerciseBlock, /Exercise \{index \+ 1\} of \{exerciseCount\}/);
    assert.doesNotMatch(stickyBar, /progressLabel/);

    assert.match(exerciseBlock, /aria-expanded=\{targetsOpenInline\}/);
    assert.match(exerciseBlock, /History className="h-3\.5 w-3\.5" aria-hidden/);
    assert.match(addExercise, /aria-expanded=\{isExpanded\}/);
    assert.match(rowActions, /<Check className="h-3\.5 w-3\.5" aria-hidden \/>/);
    assert.match(rowActions, /<Trash2 className="h-3\.5 w-3\.5" aria-hidden \/>/);
  });
});
