import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  TEMPLATE_LIST_EMPTY_ACTION,
  TEMPLATE_LIST_EMPTY_LEAD,
  TEMPLATE_LIST_EMPTY_TAIL,
  sortTemplateListRows,
  templateExerciseCountLabel,
} from "./template-list";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

function readRepo(...parts: string[]): string {
  return readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\r\n/g, "\n");
}

describe("template list", () => {
  it("sorts by name or exercise count, and breaks equal counts by name", () => {
    const rows = [
      { name: "Upper Power", exerciseCount: 6 },
      { name: "Lower Strength", exerciseCount: 4 },
      { name: "Push Focus", exerciseCount: 4 },
    ];
    assert.deepEqual(
      sortTemplateListRows(rows, { key: "name", direction: "asc" }).map((row) => row.name),
      ["Lower Strength", "Push Focus", "Upper Power"],
    );
    assert.deepEqual(
      sortTemplateListRows(rows, { key: "name", direction: "desc" }).map((row) => row.name),
      ["Upper Power", "Push Focus", "Lower Strength"],
    );
    assert.deepEqual(
      sortTemplateListRows(rows, { key: "exercises", direction: "asc" }).map((row) => row.name),
      ["Lower Strength", "Push Focus", "Upper Power"],
    );
    assert.deepEqual(
      sortTemplateListRows(rows, { key: "exercises", direction: "desc" }).map((row) => row.name),
      ["Upper Power", "Lower Strength", "Push Focus"],
    );
  });

  it("labels one exercise differently from several", () => {
    assert.equal(templateExerciseCountLabel(0), "0 exercises");
    assert.equal(templateExerciseCountLabel(1), "1 exercise");
    assert.equal(templateExerciseCountLabel(4), "4 exercises");
    assert.equal(TEMPLATE_LIST_EMPTY_LEAD, "No templates yet.");
    assert.equal(TEMPLATE_LIST_EMPTY_ACTION, "Create a template");
    assert.equal(TEMPLATE_LIST_EMPTY_TAIL, "to reuse an exercise list.");
  });

  it("uses the plan row pattern: name, exercise count, and paired actions", () => {
    const page = readRepo("evo-lift", "app", "(shell)", "app", "templates", "page.tsx");
    const editor = readRepo("evo-lift", "app", "templates", "template-editor-client.tsx");
    assert.match(page, /embedActions/);
    assert.match(page, /detailInline/);
    assert.match(page, /tracks: "count"/);
    assert.match(page, /label: "Exercises"/);
    assert.match(page, /toggleSort\("exercises"\)/);
    assert.match(page, /templateExerciseCountLabel\(row\.exerciseCount\)/);
    assert.match(page, /templateEditHref\(row\.id\)/);
    assert.equal(page.includes("FileStack"), false);
    assert.equal(page.includes("countHeading"), false);
    assert.equal(page.includes("text-red-600"), false);
    assert.match(page, /<NotesTextareaField/);
    assert.match(page, /<ActionButton[\s\S]*Start session/);
    const exerciseList = editor.indexOf("<WorkoutExerciseDraftList");
    const chart = editor.indexOf("<MuscleAreaCoverageChart");
    assert.ok(exerciseList >= 0 && chart > exerciseList);
    assert.match(editor, /<TextField/);
    assert.match(editor, /ActionLink href=\{appPath\("\/templates"\)\}/);
  });
});
