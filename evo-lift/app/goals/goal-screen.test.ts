import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("goals screen", () => {
  it("uses the shared field, button, dialog, and one progress meter", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "goals", "page.tsx");
    const editor = readRepo("evo-lift", "app", "goals", "goal-editor-dialog.tsx");
    const card = readRepo("evo-lift", "app", "goals", "goal-card.tsx");
    const summary = readRepo("evo-lift", "app", "goals", "goal-summary-chart.tsx");

    assert.match(page, /<PageAddAction/);
    assert.match(page, /<AppDialog/);
    assert.match(page, /<ActionButton/);
    assert.match(page, /<StatusNotice/);
    assert.match(page, /title="Active"[\s\S]*defaultOpen/);
    assert.equal(page.includes("text-red-600"), false);
    assert.equal(page.includes("<Target"), false);

    assert.match(editor, /<AppDialog/);
    assert.match(editor, /<TextField/);
    assert.match(editor, /<DateInput/);
    assert.match(editor, /<NotesTextareaField/);
    assert.match(editor, /<ActionButton/);
    assert.equal(editor.includes("<textarea"), false);

    assert.match(card, /<ActionButton/);
    assert.equal(card.includes("GoalProgressMeter"), false);
    assert.equal(card.includes('tone="info"'), false);
    assert.equal(card.includes('iconColor="sky"'), false);
    assert.match(summary, /<GoalProgressMeter/);
    const meter = readRepo("evo-lift", "app", "goals", "goal-progress-meter.tsx");
    assert.match(meter, /bg-sky-600/);
    assert.equal(meter.includes("bg-emerald"), false);
    assert.match(page, /key=\{activeItems\.length > 0 \? "active" : "none"\}/);
    assert.match(page, /defaultOpen=\{activeItems\.length > 0\}/);
  });
});
